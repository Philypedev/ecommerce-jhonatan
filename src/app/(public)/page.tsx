import { HomeHeroCarousel } from '@/components/home/HomeHeroCarousel';
import { HeroCarouselFallback } from '@/components/home/HeroCarouselFallback';
import { HomeBanners, type BannerData } from '@/components/home/HomeBanners';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { HomeCollectionsShowcase } from '@/components/home/HomeCollectionsShowcase';
import { TrustSection } from '@/components/home/TrustSection';
import { HowItWorks } from '@/components/home/HowItWorks';
import { getStoreSettings } from '@/lib/db/settings';
import { getHomeCollections, getPublicCategories } from '@/lib/db/categories';
import { getFeaturedProducts } from '@/lib/db/products';
import { getActiveBannersByPlacement, type BannerPlacement } from '@/lib/db/banners';
import type { HomeBanner } from '@/lib/db/types';
import { toLegacyProduct } from '@/lib/db/adapters';
import { parseHomeContent } from '@/lib/homeContent';

// Revalida em background a cada 60s — a home fica praticamente instantânea
// (servida do cache) e qualquer alteração no admin reflete em até 1 min.
export const revalidate = 60;

const mapBanner = (b: HomeBanner): BannerData => ({
  id: b.id,
  title: b.title,
  subtitle: b.subtitle,
  imageUrl: b.imageUrl,
  imageMobileUrl: b.imageMobileUrl ?? null,
  videoUrl: b.videoUrl ?? null,
  videoMobileUrl: b.videoMobileUrl ?? null,
  posterUrl: b.posterUrl ?? null,
  mediaType: b.mediaType,
  buttonText: b.buttonText,
  buttonLink: b.buttonLink,
  linkTarget: b.linkTarget,
});

export default async function HomePage() {
  // `cats` só é usado como fallback do CTA do carrossel — a home NÃO renderiza
  // mais a seção antiga de "Explore por categoria". A navegação por coleções
  // vive no header/footer.
  //
  // A home tem DOIS canais de vitrine, complementares:
  //  - `featured`: vitrine geral "Novidades para sua viagem" — produtos ACTIVE
  //    (destaques primeiro). Opcionalmente restrita a uma coleção via
  //    `settings.featuredCategoryId`.
  //  - `homeCollections`: vitrines Shopify-style — uma seção por coleção
  //    ACTIVE marcada "Exibir na home" com produto ACTIVE dentro.
  // Publicar um produto já basta para aparecer em ambas: `featured=true` só
  // decide a ORDEM (destaques primeiro dentro de cada vitrine).
  const settings = await getStoreSettings();
  const [cats, featured, homeCollections, bannersByPlacement] = await Promise.all([
    getPublicCategories(),
    getFeaturedProducts(settings.featuredCategoryId ?? null, 8),
    getHomeCollections(8),
    getActiveBannersByPlacement(),
  ]);

  const homeContent = parseHomeContent(settings.homeContentJson);

  const bannerGroup = (placement: BannerPlacement, ariaLabel: string) => {
    const list = bannersByPlacement[placement] ?? [];
    if (list.length === 0) return null;
    return <HomeBanners banners={list.map(mapBanner)} ariaLabel={ariaLabel} />;
  };

  // Carrossel principal: renderiza no topo se houver banners ativos em
  // `main_carousel`. Sem banner? mostramos um fallback minimalista no mesmo
  // tamanho/proporção — nunca voltamos para o hero clássico azul.
  const mainCarouselBanners = (bannersByPlacement.main_carousel ?? []).slice(0, 3);
  const showCarousel = mainCarouselBanners.length > 0;
  const carouselIntervalMs =
    Math.min(10, Math.max(2, settings.heroCarouselIntervalSeconds)) * 1000;

  // Rota do CTA do fallback — primeira coleção ativa da home, fallback pra
  // /categoria/ofertas se não houver nenhuma.
  const fallbackCtaHref = cats[0]?.slug
    ? `/categoria/${cats[0].slug}`
    : '/categoria/ofertas';

  return (
    <>
      {showCarousel ? (
        <HomeHeroCarousel
          slides={mainCarouselBanners.map(mapBanner)}
          intervalMs={carouselIntervalMs}
        />
      ) : (
        <HeroCarouselFallback ctaHref={fallbackCtaHref} />
      )}

      {bannerGroup('after_hero', 'Campanhas em destaque abaixo do carrossel')}

      {/* Vitrine geral — produtos vêm direto após o carrossel. */}
      <FeaturedProducts products={featured.map(toLegacyProduct)} />
      {bannerGroup('after_featured_products', 'Campanhas após os produtos em destaque')}

      {/* Vitrines Shopify-style — uma seção por coleção ACTIVE marcada
          "Exibir na home", povoada com os produtos ACTIVE da coleção. */}
      <HomeCollectionsShowcase
        collections={homeCollections.map((c) => ({
          slug: c.category.slug,
          name: c.category.name,
          description: c.category.description,
          products: c.products.map(toLegacyProduct),
        }))}
      />

      {/* Legado: os placements `after_trust_bar` e `after_featured_categories`
          ficavam ao redor da seção "Explore por categoria". Como essa seção
          foi removida da home, ambos são renderizados aqui — entre produtos
          e "Como funciona" — para não perder banners já cadastrados. Labels
          no admin foram atualizados para refletir a nova posição. */}
      {bannerGroup('after_trust_bar', 'Campanhas após a vitrine de produtos')}
      {bannerGroup(
        'after_featured_categories',
        'Campanhas antes da seção Como funciona',
      )}

      {bannerGroup('before_how_it_works', 'Campanhas antes de "Como funciona"')}
      <HowItWorks steps={homeContent.howItWorks} />

      {bannerGroup('before_trust_section', 'Campanhas antes de "Por que comprar"')}
      <TrustSection items={homeContent.trustCards} />

      {bannerGroup('before_footer', 'Campanhas antes do rodapé')}
    </>
  );
}
