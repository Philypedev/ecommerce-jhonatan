import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const WEAK_PASSWORDS = new Set([
  'admin123',
  'password',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'senha123',
]);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z
      .string()
      .min(8, 'A nova senha precisa ter ao menos 8 caracteres')
      .regex(/[a-zA-Z]/, 'Inclua ao menos uma letra')
      .regex(/[0-9]/, 'Inclua ao menos um número')
      .refine(
        (p) => !WEAK_PASSWORDS.has(p.toLowerCase()),
        'Essa senha é muito comum — escolha outra',
      ),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'A confirmação não confere com a nova senha',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'A nova senha precisa ser diferente da atual',
    path: ['newPassword'],
  });

export const productStatusSchema = z.enum(['ACTIVE', 'DRAFT', 'INACTIVE']);
export const productBadgeSchema = z.enum(['novo', 'promo', 'destaque']).optional();

/**
 * Regras de validação do produto:
 *
 * Base (aplica em qualquer status): campos são permissivos. Rascunho pode ser
 * salvo com nome vazio, sem SKU, sem categoria, com preço 0 — a action fará o
 * preenchimento de defaults ("Produto sem título", `RASCUNHO-<id>`, slug
 * derivado, categoryId null).
 *
 * `superRefine` (só quando status = ACTIVE): exige nome, SKU, categoria e
 * preço > 0. É o mesmo conjunto de campos que o botão "Publicar" no frontend
 * bloqueia — validação alinhada entre client e server.
 */
export const productSchema = z
  .object({
    name: z.string().default(''),
    slug: z.string().regex(/^[a-z0-9-]*$/, 'Slug inválido').default(''),
    shortDescription: z.string().default(''),
    fullDescription: z.string().default(''),
    price: z.coerce.number().nonnegative('Preço não pode ser negativo').default(0),
    oldPrice: z.coerce.number().nonnegative().nullable().optional(),
    installments: z.coerce.number().int().min(1).max(24).default(1),
    sku: z.string().default(''),
    brand: z.string().default(''),
    stock: z.coerce.number().int().min(0).default(0),
    status: productStatusSchema.default('DRAFT'),
    featured: z.coerce.boolean().default(false),
    position: z.coerce.number().int().default(0),
    badge: z.string().optional(),
    categoryId: z.string().nullable().optional().default(''),
    warranty: z.string().default(''),
  packageContent: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  specifications: z
    .array(z.object({ name: z.string().min(1), value: z.string().min(1) }))
    .default([]),
  faq: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .default([]),
  images: z
    .array(z.object({ url: z.string().min(1), alt: z.string().default('') }))
    .default([]),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  variantOptions: z
    .array(
      z.object({
        name: z.string().min(1, 'Nome da opção obrigatório'),
        values: z
          .array(
            z.object({
              value: z.string().min(1),
              imageUrl: z.string().nullable().optional(),
            }),
          )
          .min(1, 'Adicione ao menos um valor para esta opção'),
      }),
    )
    .default([]),
  variants: z
    .array(
      z.object({
        sku: z.string().min(1, 'SKU da variante obrigatório'),
        title: z.string().default(''),
        price: z.coerce.number().nonnegative().default(0),
        oldPrice: z.coerce.number().nonnegative().nullable().optional(),
        stock: z.coerce.number().int().nonnegative().default(0),
        active: z.coerce.boolean().default(true),
        imageUrl: z.string().nullable().optional(),
        barcode: z.string().nullable().optional(),
        optionsMap: z.record(z.string()),
      }),
    )
    .default([]),
  })
  .superRefine((data, ctx) => {
    // Só exigimos campos completos quando o admin está PUBLICANDO. Rascunho
    // e inativo podem ser salvos incompletos — action preenche defaults.
    if (data.status !== 'ACTIVE') return;

    if (!data.name.trim() || data.name.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Para publicar, informe o nome do produto (mínimo 2 caracteres).',
      });
    }
    if (!data.sku.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sku'],
        message: 'Para publicar, informe o SKU.',
      });
    }
    if (!data.categoryId || !data.categoryId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryId'],
        message: 'Para publicar, escolha uma coleção.',
      });
    }
    if (!data.price || data.price <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['price'],
        message: 'Para publicar, informe um preço maior que zero.',
      });
    }
  });

export const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().default(''),
  longDescription: z.string().default(''),
  icon: z.string().default('tag'),
  imageUrl: z.string().optional().nullable(),
  imageMobileUrl: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  position: z.coerce.number().int().default(0),
  highlight: z.coerce.boolean().default(false),
  showInMenu: z.coerce.boolean().default(true),
  showOnHome: z.coerce.boolean().default(true),
  showInFooter: z.coerce.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export const storeSettingsSchema = z.object({
  storeName: z.string().min(1),
  shortName: z.string().min(1),
  tagline: z.string().min(1),
  logoUrl: z.string().optional().nullable(),
  logoSize: z.coerce.number().int().min(24).max(56).default(36),
  faviconUrl: z.string().optional().nullable(),
  whatsappNumber: z.string().regex(/^\d{10,15}$/, 'Use formato internacional só com dígitos'),
  whatsappDisplay: z.string().min(1),
  email: z.string().email(),
  phone: z.string().default(''),
  instagram: z.string().default(''),
  facebook: z.string().default(''),
  tiktok: z.string().default(''),
  youtube: z.string().default(''),
  address: z.string().default(''),
  businessHours: z.string().default(''),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use HEX com 6 dígitos'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  heroTitle: z.string().min(1),
  heroSubtitle: z.string().default(''),
  heroImageUrl: z.string().optional().nullable(),
  heroPrimaryButtonText: z.string().min(1),
  heroSecondaryButtonText: z.string().min(1),
  shippingNote: z.string().default(''),
  footerText: z.string().default(''),
  defaultMetaTitle: z.string().min(1),
  defaultMetaDescription: z.string().min(1),
});

/** Configuração do carrossel principal — só o intervalo (2..10s). */
export const heroCarouselSettingsSchema = z.object({
  intervalSeconds: z.coerce.number().int().min(2, 'Mínimo 2 segundos').max(10, 'Máximo 10 segundos'),
});
export type HeroCarouselSettingsInput = z.infer<typeof heroCarouselSettingsSchema>;

/** SEO isolado — usado pela tela /admin/seo. */
export const seoSettingsSchema = z.object({
  defaultMetaTitle: z.string().min(1, 'Informe um título padrão'),
  defaultMetaDescription: z.string().min(1, 'Informe uma descrição padrão'),
  defaultOgImageUrl: z.string().optional().nullable(),
  searchConsoleVerification: z.string().optional().nullable(),
});
export type SeoSettingsInput = z.infer<typeof seoSettingsSchema>;

export const rotatingMessageSchema = z.object({
  text: z.string().min(2),
  active: z.coerce.boolean().default(true),
  position: z.coerce.number().int().default(0),
});

export const checkoutSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  document: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  deliveryType: z.enum(['entrega', 'retirada']),
  deliveryNote: z.string().optional(),
  payment: z.string().min(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().min(1).max(99),
        variantId: z.string().optional(),
      }),
    )
    .min(1, 'Carrinho vazio'),
});

export const homeBannerSchema = z.object({
  internalName: z.string().max(120).default(''),
  // Título/subtítulo/botão são opcionais — muitos banners já vêm com texto
  // na própria arte. O overlay só é renderizado se houver conteúdo.
  title: z.string().max(200).default(''),
  subtitle: z.string().max(400).default(''),
  imageUrl: z.string().min(1, 'Envie uma imagem desktop para este banner.'),
  imageMobileUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  videoMobileUrl: z.string().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
  buttonText: z.string().max(60).default(''),
  buttonLink: z.string().max(500).default(''),
  linkTarget: z.enum(['_self', '_blank']).default('_self'),
  placement: z.string().default('after_trust_bar'),
  active: z.coerce.boolean().default(true),
  position: z.coerce.number().int().default(0),
});

export const pageContentSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug inválido'),
  title: z.string().min(1, 'Título obrigatório'),
  content: z.string().default(''),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type HomeBannerInput = z.infer<typeof homeBannerSchema>;
export type PageContentInput = z.infer<typeof pageContentSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const ICON_NAMES = ['truck', 'shield', 'headset', 'credit-card', 'check', 'whatsapp', 'star'] as const;

export const heroBadgeSchema = z.object({
  icon: z.enum(ICON_NAMES),
  label: z.string().min(1),
});

export const trustCardSchema = z.object({
  icon: z.enum(ICON_NAMES),
  title: z.string().min(1),
  text: z.string().min(1),
});

export const howItWorksStepSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
});

export const homeContentSchema = z.object({
  heroBadges: z.array(heroBadgeSchema).max(8),
  trustCards: z.array(trustCardSchema).max(12),
  howItWorks: z.array(howItWorksStepSchema).max(12),
});

export const paymentMethodsSchema = z.object({
  methods: z.array(z.string()).min(1, 'Pelo menos uma forma de pagamento precisa ficar ativa'),
});

export type HomeContentInput = z.infer<typeof homeContentSchema>;
export type PaymentMethodsInput = z.infer<typeof paymentMethodsSchema>;
