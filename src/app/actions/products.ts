'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { productSchema, type ProductInput } from '@/lib/validation/schemas';
import { slugify } from '@/lib/slug';

type VariantOptionInput = ProductInput['variantOptions'][number];
type VariantInput = ProductInput['variants'][number];

/**
 * Valida coerência das variações antes de gravar:
 * - variants não pode existir sem variantOptions
 * - SKUs de variantes têm que ser únicos entre si
 * - herda price/stock/oldPrice do produto quando o admin deixou zerado
 *
 * Lança Error com mensagem legível (o form mostra em banner rosa).
 */
const normalizeVariations = (
  base: { price: number; oldPrice: number | null; stock: number; sku: string },
  optsRaw: VariantOptionInput[],
  variantsRaw: VariantInput[],
): { options: VariantOptionInput[]; variants: VariantInput[] } => {
  const options = optsRaw
    .map((o) => ({
      name: o.name.trim(),
      values: o.values
        .map((v) => ({
          value: v.value.trim(),
          imageUrl: v.imageUrl && v.imageUrl.length > 0 ? v.imageUrl : null,
        }))
        .filter((v) => v.value.length > 0),
    }))
    .filter((o) => o.name.length > 0);

  if (options.length === 0) return { options: [], variants: [] };
  for (const o of options) {
    if (o.values.length === 0) {
      throw new Error(`A opção "${o.name}" precisa ter ao menos um valor.`);
    }
  }

  const optionNames = options.map((o) => o.name);
  const seenSkus = new Set<string>();

  const variants = variantsRaw.map((v, i) => {
    const cleanMap: Record<string, string> = {};
    for (const name of optionNames) {
      const value = (v.optionsMap ?? {})[name];
      if (typeof value !== 'string' || value.length === 0) {
        throw new Error(
          `Variante #${i + 1} está sem valor para "${name}". Regenere as combinações.`,
        );
      }
      cleanMap[name] = value;
    }
    const title = optionNames.map((n) => cleanMap[n]).join(' / ');
    const sku = (v.sku ?? '').trim();
    if (!sku) throw new Error(`Variante "${title}" precisa de um SKU.`);
    if (seenSkus.has(sku)) {
      throw new Error(`SKU "${sku}" está repetido em mais de uma variante.`);
    }
    seenSkus.add(sku);

    return {
      sku,
      title,
      // Herança: se o admin deixou zerado/vazio, cai no valor do produto pai.
      price: Number.isFinite(v.price) && v.price > 0 ? v.price : base.price,
      oldPrice:
        v.oldPrice === null || v.oldPrice === undefined
          ? base.oldPrice
          : v.oldPrice,
      stock: Number.isFinite(v.stock) ? v.stock : base.stock,
      active: v.active,
      imageUrl: v.imageUrl && v.imageUrl.length > 0 ? v.imageUrl : null,
      barcode: v.barcode && v.barcode.length > 0 ? v.barcode : null,
      optionsMap: cleanMap,
    };
  });

  return { options, variants };
};

/**
 * Invalida todos os caches públicos afetados por mudança em produto:
 *   - home (vitrine + contagens)
 *   - páginas de categoria (grid + paginação)
 *   - PDPs (produto direto, JSON-LD, imagens)
 *   - sitemap.xml (produtos ACTIVE entram/saem)
 *   - página de busca (query dinâmica — força SSR fresh)
 *   - admin de produtos (badge/count)
 */
const revalidateAll = () => {
  revalidatePath('/', 'layout');
  revalidatePath('/categoria/[slug]', 'page');
  revalidatePath('/produto/[slug]', 'page');
  revalidatePath('/sitemap.xml');
  revalidatePath('/busca');
  revalidatePath('/admin/produtos');
};

const ensureUniqueSlug = async (
  baseSlug: string,
  excludeId?: string,
): Promise<string> => {
  let slug = baseSlug || 'produto';
  let attempt = 1;
  while (true) {
    const exists = await prisma.product.findFirst({
      where: { slug, NOT: excludeId ? { id: excludeId } : undefined },
      select: { id: true },
    });
    if (!exists) return slug;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }
};

/**
 * Rascunho pode chegar com nome vazio, sem SKU e sem slug. Aqui geramos
 * defaults técnicos pra atender ao banco (slug/sku têm @unique), preservando
 * a possibilidade do admin trocar depois. Só mexemos em campos vazios.
 *
 * `parsed` já passou pelo Zod — em ACTIVE o superRefine bloqueia campos
 * vazios, então esta função só age em DRAFT/INACTIVE.
 */
const applyDraftDefaults = (parsed: ProductInput): void => {
  if (!parsed.name.trim()) {
    parsed.name = 'Produto sem título';
  }
  if (!parsed.sku.trim()) {
    // Sufixo curto pra garantir @unique sem revelar informação sensível.
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    parsed.sku = `RASCUNHO-${suffix}`;
  }
  // slug fica com string vazia — ensureUniqueSlug transforma em `produto`
  // (ou `produto-2`, `produto-3`, ...) na inserção.
};

export async function createProductAction(input: ProductInput) {
  await requireAdmin();
  const parsed = productSchema.parse(input);
  applyDraftDefaults(parsed);
  parsed.slug = await ensureUniqueSlug(parsed.slug || slugify(parsed.name));

  const { options: cleanOptions, variants: cleanVariants } = normalizeVariations(
    {
      price: parsed.price,
      oldPrice: parsed.oldPrice ?? null,
      stock: parsed.stock,
      sku: parsed.sku,
    },
    parsed.variantOptions,
    parsed.variants,
  );

  // Tudo dentro de uma transaction interativa — se qualquer passo falhar, o
  // produto não é criado (rollback automático) e nenhum registro parcial fica
  // no banco. Timeout ampliado para acomodar 20+ variantes com nested creates.
  const created = await prisma.$transaction(
    async (tx) => {
      const product = await tx.product.create({
        data: {
          name: parsed.name,
          slug: parsed.slug,
          shortDescription: parsed.shortDescription,
          fullDescription: parsed.fullDescription,
          price: parsed.price,
          oldPrice: parsed.oldPrice ?? null,
          costPrice: parsed.costPrice ?? null,
          installments: parsed.installments,
          sku: parsed.sku,
          brand: parsed.brand,
          stock: parsed.stock,
          status: parsed.status,
          featured: parsed.featured,
          position: parsed.position,
          badge: parsed.badge && parsed.badge !== '' ? parsed.badge : null,
          // categoryId agora é nullable no schema — rascunho sem categoria
          // grava null e o vínculo fica pendente até publicação.
          categoryId: parsed.categoryId && parsed.categoryId.trim() ? parsed.categoryId : null,
          warranty: parsed.warranty,
          packageContent: JSON.stringify(parsed.packageContent),
          metaTitle: parsed.metaTitle || null,
          metaDescription: parsed.metaDescription || null,
          images: {
            create: parsed.images.map((img, i) => ({
              url: img.url,
              alt: img.alt,
              position: i,
            })),
          },
          specifications: {
            create: parsed.specifications.map((s, i) => ({
              name: s.name,
              value: s.value,
              position: i,
            })),
          },
          faq: {
            create: parsed.faq.map((f, i) => ({
              question: f.question,
              answer: f.answer,
              position: i,
            })),
          },
          benefits: {
            create: parsed.benefits.map((b, i) => ({ text: b, position: i })),
          },
        },
      });

      if (cleanOptions.length > 0) {
        for (let i = 0; i < cleanOptions.length; i++) {
          const opt = cleanOptions[i];
          const createdOpt = await tx.productVariantOption.create({
            data: {
              productId: product.id,
              name: opt.name,
              position: i,
            },
          });
          // Cada valor cria individualmente pra podermos setar imageUrl via
          // raw SQL — coluna imageUrl foi adicionada via db push e o Prisma
          // client não conhece ainda (rebuild travado no Windows).
          for (let j = 0; j < opt.values.length; j++) {
            const src = opt.values[j];
            const val = await tx.productVariantValue.create({
              data: {
                optionId: createdOpt.id,
                value: src.value,
                position: j,
              },
            });
            if (src.imageUrl) {
              await tx.$executeRaw`UPDATE ProductVariantValue SET imageUrl = ${src.imageUrl} WHERE id = ${val.id}`;
            }
          }
        }
        await tx.productVariant.createMany({
          data: cleanVariants.map((v, i) => ({
            productId: product.id,
            title: v.title,
            sku: v.sku,
            price: v.price,
            oldPrice: v.oldPrice ?? null,
            stock: v.stock,
            active: v.active,
            imageUrl: v.imageUrl,
            barcode: v.barcode,
            optionsJson: JSON.stringify(v.optionsMap),
            position: i,
          })),
        });
      }

      return product;
    },
    { timeout: 15000 },
  );

  revalidateAll();
  // `as` sinaliza pro form qual mensagem de sucesso mostrar (rascunho vs
  // publicado). Sem `as` = fallback pra "salvo com sucesso".
  redirect(
    `/admin/produtos/${created.id}?saved=1&as=${parsed.status.toLowerCase()}`,
  );
}

export async function updateProductAction(id: string, input: ProductInput) {
  await requireAdmin();
  const parsed = productSchema.parse(input);
  applyDraftDefaults(parsed);
  parsed.slug = await ensureUniqueSlug(parsed.slug || slugify(parsed.name), id);

  const { options: cleanOptions, variants: cleanVariants } = normalizeVariations(
    {
      price: parsed.price,
      oldPrice: parsed.oldPrice ?? null,
      stock: parsed.stock,
      sku: parsed.sku,
    },
    parsed.variantOptions,
    parsed.variants,
  );

  // Transaction interativa envolvendo TUDO: update dos escalares, delete de
  // todos os filhos (imagens/specs/FAQ/benefícios/variantes/opções — valores
  // caem em cascade via ProductVariantOption) e recreate. Se qualquer passo
  // falhar, rollback total: o produto NUNCA fica em estado parcial (por
  // exemplo, sem imagens ou sem variantes).
  //
  // Timeout ampliado para 15s: nested create de opções+valores em produtos
  // com muitas variações é sequencial e pode passar do padrão de 5s.
  await prisma.$transaction(
    async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: parsed.name,
          slug: parsed.slug,
          shortDescription: parsed.shortDescription,
          fullDescription: parsed.fullDescription,
          price: parsed.price,
          oldPrice: parsed.oldPrice ?? null,
          costPrice: parsed.costPrice ?? null,
          installments: parsed.installments,
          sku: parsed.sku,
          brand: parsed.brand,
          stock: parsed.stock,
          status: parsed.status,
          featured: parsed.featured,
          position: parsed.position,
          badge: parsed.badge && parsed.badge !== '' ? parsed.badge : null,
          // categoryId nullable no schema — draft aceita null e o produto
          // deixa de ser público até que uma categoria seja definida.
          categoryId: parsed.categoryId && parsed.categoryId.trim() ? parsed.categoryId : null,
          warranty: parsed.warranty,
          packageContent: JSON.stringify(parsed.packageContent),
          metaTitle: parsed.metaTitle || null,
          metaDescription: parsed.metaDescription || null,
        },
      });

      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productSpecification.deleteMany({ where: { productId: id } });
      await tx.productFAQ.deleteMany({ where: { productId: id } });
      await tx.productBenefit.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      // ProductVariantValue cai em cascade quando removemos ProductVariantOption
      await tx.productVariantOption.deleteMany({ where: { productId: id } });

      if (parsed.images.length > 0) {
        await tx.productImage.createMany({
          data: parsed.images.map((img, i) => ({
            productId: id,
            url: img.url,
            alt: img.alt,
            position: i,
          })),
        });
      }
      if (parsed.specifications.length > 0) {
        await tx.productSpecification.createMany({
          data: parsed.specifications.map((s, i) => ({
            productId: id,
            name: s.name,
            value: s.value,
            position: i,
          })),
        });
      }
      if (parsed.faq.length > 0) {
        await tx.productFAQ.createMany({
          data: parsed.faq.map((f, i) => ({
            productId: id,
            question: f.question,
            answer: f.answer,
            position: i,
          })),
        });
      }
      if (parsed.benefits.length > 0) {
        await tx.productBenefit.createMany({
          data: parsed.benefits.map((b, i) => ({
            productId: id,
            text: b,
            position: i,
          })),
        });
      }

      if (cleanOptions.length > 0) {
        for (let i = 0; i < cleanOptions.length; i++) {
          const opt = cleanOptions[i];
          const createdOpt = await tx.productVariantOption.create({
            data: {
              productId: id,
              name: opt.name,
              position: i,
            },
          });
          // Ver comentário em createProductAction — valor cria via Prisma e
          // imageUrl setamos via raw SQL (client sem regenerate).
          for (let j = 0; j < opt.values.length; j++) {
            const src = opt.values[j];
            const val = await tx.productVariantValue.create({
              data: {
                optionId: createdOpt.id,
                value: src.value,
                position: j,
              },
            });
            if (src.imageUrl) {
              await tx.$executeRaw`UPDATE ProductVariantValue SET imageUrl = ${src.imageUrl} WHERE id = ${val.id}`;
            }
          }
        }
        await tx.productVariant.createMany({
          data: cleanVariants.map((v, i) => ({
            productId: id,
            title: v.title,
            sku: v.sku,
            price: v.price,
            oldPrice: v.oldPrice ?? null,
            stock: v.stock,
            active: v.active,
            imageUrl: v.imageUrl,
            barcode: v.barcode,
            optionsJson: JSON.stringify(v.optionsMap),
            position: i,
          })),
        });
      }
    },
    { timeout: 15000 },
  );

  revalidateAll();
  redirect(`/admin/produtos/${id}?saved=1&as=${parsed.status.toLowerCase()}`);
}

export async function deleteProductAction(id: string) {
  await requireAdmin();
  await prisma.product.delete({ where: { id } });
  revalidateAll();
  redirect('/admin/produtos');
}

export async function toggleProductStatusAction(id: string, status: string) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { status } });
  revalidateAll();
}

// ─────────────────────────── ações em massa ───────────────────────────
//
// Todas exigem admin, aceitam array de ids não vazio (limitado a 500 pra evitar
// abuso via console), e devolvem `{ ok: true, count }` — o client mostra toast.
// updateMany/deleteMany não disparam erro se algum id não bater; isso é OK
// porque a UI só passa ids da própria página, e ficamos idempotentes.

const MAX_BULK_IDS = 500;

type BulkResult = { ok: true; count: number } | { ok: false; error: string };

const validateBulkIds = (ids: unknown): string[] | null => {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BULK_IDS) return null;
  const clean = ids.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return clean.length > 0 ? clean : null;
};

export async function bulkActivateProductsAction(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  const clean = validateBulkIds(ids);
  if (!clean) return { ok: false, error: 'Nenhum produto selecionado.' };
  const { count } = await prisma.product.updateMany({
    where: { id: { in: clean } },
    data: { status: 'ACTIVE' },
  });
  revalidateAll();
  return { ok: true, count };
}

export async function bulkDeactivateProductsAction(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  const clean = validateBulkIds(ids);
  if (!clean) return { ok: false, error: 'Nenhum produto selecionado.' };
  const { count } = await prisma.product.updateMany({
    where: { id: { in: clean } },
    data: { status: 'INACTIVE' },
  });
  revalidateAll();
  return { ok: true, count };
}

export async function bulkSetFeaturedAction(
  ids: string[],
  featured: boolean,
): Promise<BulkResult> {
  await requireAdmin();
  const clean = validateBulkIds(ids);
  if (!clean) return { ok: false, error: 'Nenhum produto selecionado.' };
  const { count } = await prisma.product.updateMany({
    where: { id: { in: clean } },
    data: { featured: Boolean(featured) },
  });
  revalidateAll();
  return { ok: true, count };
}

export async function bulkDeleteProductsAction(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  const clean = validateBulkIds(ids);
  if (!clean) return { ok: false, error: 'Nenhum produto selecionado.' };
  // Cascade em ProductImage/Specification/FAQ/Benefit já é definido no schema.
  const { count } = await prisma.product.deleteMany({ where: { id: { in: clean } } });
  revalidateAll();
  return { ok: true, count };
}

export async function duplicateProductAction(id: string) {
  await requireAdmin();
  const original = await prisma.product.findUnique({
    where: { id },
    include: {
      images: true,
      specifications: true,
      faq: true,
      benefits: true,
    },
  });
  if (!original) redirect('/admin/produtos');

  const newSlug = await ensureUniqueSlug(`${original!.slug}-copia`);
  const newSku = `${original!.sku}-COPIA-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const copy = await prisma.product.create({
    data: {
      name: `${original!.name} (cópia)`,
      slug: newSlug,
      shortDescription: original!.shortDescription,
      fullDescription: original!.fullDescription,
      price: original!.price,
      oldPrice: original!.oldPrice,
      installments: original!.installments,
      sku: newSku,
      brand: original!.brand,
      stock: original!.stock,
      status: 'DRAFT',
      featured: false,
      badge: original!.badge,
      categoryId: original!.categoryId,
      warranty: original!.warranty,
      packageContent: original!.packageContent,
      images: {
        create: original!.images.map((i) => ({ url: i.url, alt: i.alt, position: i.position })),
      },
      specifications: {
        create: original!.specifications.map((s) => ({
          name: s.name,
          value: s.value,
          position: s.position,
        })),
      },
      faq: {
        create: original!.faq.map((f) => ({
          question: f.question,
          answer: f.answer,
          position: f.position,
        })),
      },
      benefits: {
        create: original!.benefits.map((b) => ({ text: b.text, position: b.position })),
      },
    },
  });

  revalidateAll();
  redirect(`/admin/produtos/${copy.id}`);
}
