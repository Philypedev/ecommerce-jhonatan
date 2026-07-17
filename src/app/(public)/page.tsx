import { HomeHeroCarousel } from '@/components/home/HomeHeroCarousel';
import { HeroCarouselFallback } from '@/components/home/HeroCarouselFallback';
import { HomeBanners, type BannerData } from '@/components/home/HomeBanners';
import { HomeCollectionsShowcase } from '@/components/home/HomeCollectionsShowcase';
import { TrustSection } from '@/components/home/TrustSection';
import { HowItWorks } from '@/components/home/HowItWorks';
import { getStoreSettings } from '@/lib/db/settings';
import { getHomeCollections, getPublicCategories } from '@/lib/db/categories';
import { getActiveBannersByPlacement, type BannerPlacement } from '@/lib/db/banners';
import type { HomeBanner } from '@/lib/db/types';
import { toLegacyProduct } from '@/lib/db/adapters';
import { parseHomeContent } from '@/lib/homeContent';

// Home 100% dinâmica em runtime — cada request lê o banco de produção.
// Antes rodava com `revalidate = 60`, o que combinado com o build vazio
// do Docker (Dockerfile usa /tmp/traveltech-build.db) prendia a home no
// snapshot do build até uma Server Action chamar revalidatePath('/').
// Agora, publicar produto/banner/coleção reflete na próxima navegação
// sem depender de re-salvar nada no admin. Custo aceito pelo produto:
// a home carrega poucas queries agregadas e é a página crítica.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  // A navegação por coleções vive no header/footer/páginas de categoria.
  // `cats` é fallback para o CTA do carrossel quando não há banners ativos.
  //
  // Vitrines da home (Shopify-style): uma seção por coleção ACTIVE com
  // pelo menos 1 produto ACTIVE. `showOnHome=true` prioriza a ordem,
  // mas NÃO é obrigatório — publicar coleção+produto já faz aparecer.
  const settings = await getStoreSettings();
  const [cats, homeCollections, bannersByPlacement] = await Promise.all([
    getPublicCategories(),
    getHomeCollections(8),
    getActiveBannersByPlacement(),
  ]);

  const homeContent = parseHomeContent(settings.homeContentJson);

  const bannerGroup = (placement: BannerPlacement, ariaLabel: string) => {
    const list = bannersByPlacement[placement] ?? [];
    if (list.length === 0) return null;
    return <HomeBanners banners={list.map(mapBanner)} ariaLabel={ariaLabel} />;
  };

  // Carrossel principal no topo se houver banners ativos em `main_carousel`.
  // Sem banner? mostramos um fallback minimalista no mesmo tamanho/proporção.
  const mainCarouselBanners = (bannersByPlacement.main_carousel ?? []).slice(0, 3);
  const showCarousel = mainCarouselBanners.length > 0;
  const carouselIntervalMs =
    Math.min(10, Math.max(2, settings.heroCarouselIntervalSeconds)) * 1000;

  // Rota do CTA do fallback — primeira coleção com produto ACTIVE ou /categoria/ofertas.
  const fallbackCtaHref = homeCollections[0]?.category.slug
    ? `/categoria/${homeCollections[0].category.slug}`
    : cats[0]?.slug
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

      {/* Vitrines Shopify-style — uma seção por coleção ACTIVE que tem
          produto ACTIVE dentro. Ordem: showOnHome=true primeiro, depois
          por position. Publicar coleção + produto já basta pra aparecer. */}
      <HomeCollectionsShowcase
        collections={homeCollections.map((c) => ({
          slug: c.category.slug,
          name: c.category.name,
          description: c.category.description,
          products: c.products.map(toLegacyProduct),
        }))}
      />

      {bannerGroup('after_featured_products', 'Campanhas após os produtos em destaque')}

      {/* Legado: os placements `after_trust_bar` e `after_featured_categories`
          ficavam ao redor da seção "Explore por categoria". Como essa seção
          foi removida da home, ambos são renderizados aqui — entre vitrines
          e "Como funciona" — para não perder banners já cadastrados. */}
      {bannerGroup('after_trust_bar', 'Campanhas após as vitrines de coleções')}
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
