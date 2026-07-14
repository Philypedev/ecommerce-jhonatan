'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/slug';
import { createProductAction, updateProductAction } from '@/app/actions/products';
import type { ProductInput } from '@/lib/validation/schemas';
import { ProductImagesField, type ProductImageEntry } from './ProductImagesField';
import { formatCurrency } from '@/utils/formatCurrency';

type CategoryOption = { id: string; name: string };

type Props = {
  productId?: string;
  initial?: Partial<ProductInput>;
  categories: CategoryOption[];
  saved?: boolean;
  /**
   * Vem do query param `?as=`. Diferencia mensagem de sucesso entre rascunho
   * salvo vs produto publicado. `undefined` (compat) cai no genérico.
   */
  savedAs?: 'draft' | 'active' | 'inactive';
};

/**
 * Normaliza input decimal digitado no browser:
 *  - troca vírgula por ponto
 *  - remove caracteres não-numéricos (exceto ponto)
 *  - permite só um ponto decimal
 *  - remove zeros à esquerda ("0333" → "333", "00" → "0", "00,50" → "0.50")
 *
 * Retorna a string normalizada (para exibir de volta no input) e o número.
 */
const normalizeDecimalInput = (raw: string): { display: string; value: number } => {
  let s = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  // Strip leading zeros mas preserva "0", "0.xxx" e string vazia
  if (s.length > 1 && s.startsWith('0') && s[1] !== '.') {
    s = s.replace(/^0+/, '') || '0';
  }
  const num = s === '' || s === '.' ? 0 : Number(s);
  return { display: s, value: Number.isFinite(num) ? num : 0 };
};

const defaultData: ProductInput = {
  name: '',
  slug: '',
  shortDescription: '',
  fullDescription: '',
  price: 0,
  oldPrice: null,
  installments: 12,
  sku: '',
  brand: '',
  stock: 0,
  status: 'DRAFT',
  featured: false,
  position: 0,
  badge: '',
  categoryId: '',
  warranty: '',
  packageContent: [],
  benefits: [],
  specifications: [],
  faq: [],
  images: [],
  metaTitle: '',
  metaDescription: '',
  variantOptions: [],
  variants: [],
};

/**
 * Gera cartesiano das opções e MESCLA com variantes existentes (mesmo optionsMap
 * mantém edições de SKU/preço/estoque). Combinações novas herdam base do produto.
 * `values` agora são objetos `{value, imageUrl?}` — só o campo `.value` entra
 * na chave da combinação; a imagem do valor é fallback separado no PDP.
 */
const regenerateVariants = (
  options: ProductInput['variantOptions'],
  existing: ProductInput['variants'],
  base: { price: number; stock: number; oldPrice: number | null; sku: string },
): ProductInput['variants'] => {
  const validOptions = options.filter(
    (o) => o.name.trim() && o.values.filter((v) => v.value.trim()).length > 0,
  );
  if (validOptions.length === 0) return [];

  const cart = validOptions.reduce<Record<string, string>[]>(
    (acc, opt) =>
      acc.flatMap((prev) =>
        opt.values
          .filter((v) => v.value.trim())
          .map((v) => ({ ...prev, [opt.name]: v.value })),
      ),
    [{}],
  );

  const keyOf = (m: Record<string, string>) =>
    Object.entries(m)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('|');

  const existingByKey = new Map(existing.map((v) => [keyOf(v.optionsMap), v]));

  return cart.map((optionsMap) => {
    const prior = existingByKey.get(keyOf(optionsMap));
    if (prior) return { ...prior, optionsMap };

    const skuSuffix = Object.values(optionsMap)
      .map((v) => v.toUpperCase().replace(/\s+/g, '').slice(0, 4))
      .join('-');
    const title = Object.values(optionsMap).join(' / ');

    return {
      optionsMap,
      title,
      sku: base.sku ? `${base.sku}-${skuSuffix}` : '',
      price: base.price,
      oldPrice: base.oldPrice,
      stock: base.stock,
      active: true,
      imageUrl: null,
      barcode: null,
    };
  });
};

const SEO_TITLE_IDEAL: [number, number] = [50, 60];
const SEO_DESC_IDEAL: [number, number] = [140, 160];

export const ProductForm = ({
  productId,
  initial,
  categories,
  saved,
  savedAs,
}: Props) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

  const [data, setData] = useState<ProductInput>({
    ...defaultData,
    ...initial,
    packageContent: initial?.packageContent ?? [],
    benefits: initial?.benefits ?? [],
    specifications: initial?.specifications ?? [],
    faq: initial?.faq ?? [],
    images: initial?.images ?? [],
    variantOptions: initial?.variantOptions ?? [],
    variants: initial?.variants ?? [],
  });

  // Preço e preço-antigo: mantemos a string "visível" no input separada do
  // número gravado no state. Isso preserva o cursor e permite normalizar
  // (strip zeros à esquerda, aceitar vírgula) sem lutar contra o React.
  const [priceInput, setPriceInput] = useState<string>(
    () => (initial?.price != null && initial.price > 0 ? String(initial.price) : ''),
  );
  const [oldPriceInput, setOldPriceInput] = useState<string>(
    () => (initial?.oldPrice != null ? String(initial.oldPrice) : ''),
  );

  // Ligado automaticamente quando o produto já tem opções salvas
  const [variationsEnabled, setVariationsEnabled] = useState(
    (initial?.variantOptions?.length ?? 0) > 0,
  );

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const handleName = (name: string) => {
    set('name', name);
    if (!slugTouched) set('slug', slugify(name));
  };

  const toggleVariations = (enabled: boolean) => {
    setVariationsEnabled(enabled);
    if (!enabled) {
      // Zera arrays só na hora do submit — mantemos em memória para o admin
      // conseguir religar sem perder o que já digitou.
    } else if (data.variantOptions.length === 0) {
      // Ao ligar pela primeira vez, deixamos vazio; o admin adiciona opções.
    }
  };

  // Atualiza opções e REGENERA a matriz de variantes preservando edições.
  const updateVariantOptions = (nextOptions: ProductInput['variantOptions']) => {
    const nextVariants = regenerateVariants(nextOptions, data.variants, {
      price: data.price,
      stock: data.stock,
      oldPrice: data.oldPrice ?? null,
      sku: data.sku,
    });
    setData((d) => ({ ...d, variantOptions: nextOptions, variants: nextVariants }));
  };

  const updateVariant = (idx: number, patch: Partial<ProductInput['variants'][number]>) => {
    setData((d) => ({
      ...d,
      variants: d.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }));
  };

  const submit = (e: React.FormEvent, forceStatus?: ProductInput['status']) => {
    e.preventDefault();
    setError(null);
    const targetStatus = forceStatus ?? data.status;

    // Validação client-side alinhada com a superRefine do Zod: só bloqueia
    // envio quando o alvo é ACTIVE. Rascunho/inativo sempre passam.
    if (targetStatus === 'ACTIVE') {
      const missing: string[] = [];
      if (!data.name.trim() || data.name.trim().length < 2) missing.push('nome');
      if (!data.sku.trim()) missing.push('SKU');
      if (!data.categoryId) missing.push('coleção');
      if (!data.price || data.price <= 0) missing.push('preço');
      if (missing.length > 0) {
        setError(
          `Para publicar, preencha: ${missing.join(', ')}. Você pode salvar como rascunho enquanto termina.`,
        );
        return;
      }
    }

    // Se o toggle de variações está OFF, mandamos arrays vazios (produto
    // simples). Ligado, enviamos o que está em memória — o backend regenera
    // title/sku e valida coerência via normalizeVariations.
    const payload: ProductInput = {
      ...data,
      status: targetStatus,
      variantOptions: variationsEnabled ? data.variantOptions : [],
      variants: variationsEnabled ? data.variants : [],
    };
    startTransition(async () => {
      try {
        if (productId) await updateProductAction(productId, payload);
        else await createProductAction(payload);
      } catch (e) {
        if (e instanceof Error && !e.message.startsWith('NEXT_REDIRECT')) {
          setError(e.message);
        }
      }
    });
  };

  const hasDiscount = data.oldPrice != null && data.oldPrice > data.price;
  const discountPct = hasDiscount
    ? Math.round(((data.oldPrice! - data.price) / data.oldPrice!) * 100)
    : 0;

  // Só mostra o aviso "Preencha X para publicar" quando o admin JÁ escolheu
  // ACTIVE. Rascunho/inativo não precisam de nada.
  const missingForPublish =
    data.status === 'ACTIVE' &&
    (!data.name.trim() ||
      !data.sku.trim() ||
      !data.categoryId ||
      data.price <= 0);

  return (
    <form onSubmit={(e) => submit(e)} className="space-y-6" noValidate>
      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {savedAs === 'draft'
            ? 'Rascunho salvo com sucesso.'
            : savedAs === 'inactive'
              ? 'Produto salvo como inativo.'
              : savedAs === 'active'
                ? 'Produto publicado com sucesso.'
                : 'Produto salvo com sucesso.'}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─────── Coluna principal ─────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Informações básicas */}
          <Section
            number={1}
            title="Informações básicas"
            subtitle="Nome, código e identificadores do produto."
            icon={<InfoSvg />}
          >
            <div className="grid gap-4">
              <Field
                label="Nome do produto"
                required
                hint="Obrigatório para publicar. Rascunho pode ser salvo sem nome — vira &quot;Produto sem título&quot; automaticamente."
              >
                <input
                  value={data.name}
                  onChange={(e) => handleName(e.target.value)}
                  placeholder="Ex.: Mala de bordo TravelPro 20"
                  className="field-input"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Slug (URL)"
                  hint="Gerado a partir do nome. Edite se quiser um link mais amigável."
                >
                  <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-100/40 px-3 focus-within:border-brand-500 focus-within:bg-white">
                    <span className="text-xs text-ink-500">/produto/</span>
                    <input
                      value={data.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        set('slug', slugify(e.target.value));
                      }}
                      className="w-full border-0 bg-transparent py-2 font-mono text-xs text-ink-900 focus:outline-none"
                    />
                  </div>
                </Field>

                <Field
                  label="SKU"
                  required
                  hint="Obrigatório para publicar. Rascunho recebe SKU temporário automático."
                >
                  <input
                    value={data.sku}
                    onChange={(e) => set('sku', e.target.value)}
                    placeholder="Ex.: TP-2024-BLK-20"
                    className="field-input font-mono text-xs"
                  />
                </Field>
              </div>

              <Field label="Marca" hint="Fabricante ou marca própria (opcional).">
                <input
                  value={data.brand}
                  onChange={(e) => set('brand', e.target.value)}
                  placeholder="Ex.: TravelPro"
                  className="field-input"
                />
              </Field>
            </div>
          </Section>

          {/* 2. Descrição */}
          <Section
            number={2}
            title="Descrição"
            subtitle="Texto curto para vitrines e descrição completa para a página do produto."
            icon={<DocSvg />}
          >
            <div className="grid gap-4">
              <Field
                label="Descrição curta"
                hint="Aparece em cards e resumos. Ideal até 160 caracteres."
              >
                <textarea
                  rows={2}
                  value={data.shortDescription}
                  onChange={(e) => set('shortDescription', e.target.value)}
                  className="field-input"
                  placeholder="Um resumo direto do produto e seu principal diferencial."
                />
                <CharCounter
                  value={data.shortDescription}
                  min={80}
                  max={160}
                  className="mt-1"
                />
              </Field>

              <Field
                label="Descrição completa"
                hint="Suporta quebras de linha. Use para detalhar o produto."
              >
                <textarea
                  rows={6}
                  value={data.fullDescription}
                  onChange={(e) => set('fullDescription', e.target.value)}
                  className="field-input"
                  placeholder="Fale sobre o produto, materiais, ocasiões de uso e diferenciais."
                />
              </Field>
            </div>
          </Section>

          {/* 3. Mídia */}
          <Section
            number={3}
            title="Mídia"
            subtitle="A primeira imagem será usada como capa em todas as vitrines."
            icon={<ImageSvg />}
          >
            <ProductImagesField
              images={data.images as ProductImageEntry[]}
              onChange={(imgs) => set('images', imgs)}
              hint="1000 × 1000 px (quadrado 1:1) — JPG, PNG ou WEBP até 6 MB. Fundo branco ou neutro recomendado."
            />
          </Section>

          {/* 4. Preço e estoque */}
          <Section
            number={4}
            title="Preço e estoque"
            subtitle="Valores exibidos na loja. Preço antigo é usado para calcular o desconto automático."
            icon={<PriceSvg />}
          >
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Preço (R$)" required>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={priceInput}
                  onChange={(e) => {
                    const { display, value } = normalizeDecimalInput(e.target.value);
                    setPriceInput(display);
                    set('price', value);
                  }}
                  placeholder="0,00"
                  className="field-input"
                />
              </Field>
              <Field
                label="Preço antigo (R$)"
                hint="Deixe vazio se não houver desconto."
              >
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={oldPriceInput}
                  onChange={(e) => {
                    // "" = sem preço antigo (null no banco)
                    if (e.target.value.trim() === '') {
                      setOldPriceInput('');
                      set('oldPrice', null);
                      return;
                    }
                    const { display, value } = normalizeDecimalInput(e.target.value);
                    setOldPriceInput(display);
                    set('oldPrice', value);
                  }}
                  placeholder="0,00"
                  className="field-input"
                />
              </Field>
              <Field label="Parcelas" hint="Máximo de parcelas exibidas na loja.">
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={data.installments}
                  onChange={(e) => set('installments', Number(e.target.value))}
                  className="field-input"
                />
              </Field>
              <Field label="Estoque">
                <input
                  type="number"
                  min={0}
                  value={data.stock}
                  onChange={(e) => set('stock', Number(e.target.value))}
                  className="field-input"
                />
              </Field>
            </div>

            {hasDiscount && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckBadgeSvg size={14} />
                Desconto de {discountPct}% aplicado automaticamente na loja.
              </p>
            )}

            {data.stock === 0 && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                <AlertSvg size={14} />
                Estoque zerado — o produto será exibido como &ldquo;Sob consulta&rdquo;.
              </p>
            )}
          </Section>

          {/* 5. Variações */}
          <Section
            number={5}
            title="Variações"
            subtitle="Cor, tamanho e outras opções que geram combinações do mesmo produto."
            icon={<GridSvg />}
            action={
              <label className="inline-flex items-center gap-2 rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm">
                <input
                  type="checkbox"
                  checked={variationsEnabled}
                  onChange={(e) => toggleVariations(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Este produto tem variações
              </label>
            }
          >
            {!variationsEnabled ? (
              <p className="rounded-xl border border-dashed border-ink-200 bg-ink-100/30 p-4 text-sm text-ink-500">
                Deixe desligado se o produto é vendido em uma única configuração. Ative para
                cadastrar múltiplas opções (ex.: cor + tamanho).
              </p>
            ) : (
              <VariationsBuilder
                options={data.variantOptions}
                variants={data.variants}
                onOptionsChange={updateVariantOptions}
                onVariantChange={updateVariant}
              />
            )}
          </Section>

          {/* 6. Benefícios */}
          <Section
            number={6}
            title="Benefícios"
            subtitle="Frases curtas que aparecem em destaque na página do produto."
            icon={<CheckListSvg />}
          >
            <DynamicList
              items={data.benefits}
              onChange={(v) => set('benefits', v)}
              placeholder="Ex.: Rodas 360º silenciosas"
              addLabel="Adicionar benefício"
            />
          </Section>

          {/* 7. Especificações */}
          <Section
            number={7}
            title="Especificações técnicas"
            subtitle="Tabela de atributos técnicos (dimensões, materiais, capacidade...)."
            icon={<ListSvg />}
          >
            <SpecsList items={data.specifications} onChange={(v) => set('specifications', v)} />
          </Section>

          {/* 8. Conteúdo da embalagem */}
          <Section
            number={8}
            title="Conteúdo da embalagem"
            subtitle="Itens que acompanham o produto na entrega."
            icon={<BoxSvg />}
          >
            <DynamicList
              items={data.packageContent}
              onChange={(v) => set('packageContent', v)}
              placeholder='Ex.: 1x Mala de bordo 20"'
              addLabel="Adicionar item"
            />
          </Section>

          {/* 9. Garantia */}
          <Section
            number={9}
            title="Garantia"
            subtitle="Prazo e cobertura oferecida pela fabricante ou pela loja."
            icon={<ShieldSvg />}
          >
            <textarea
              rows={2}
              value={data.warranty}
              onChange={(e) => set('warranty', e.target.value)}
              className="field-input"
              placeholder="Ex.: 12 meses de garantia direta com o fabricante."
            />
          </Section>

          {/* 10. FAQ */}
          <Section
            number={10}
            title="Perguntas frequentes"
            subtitle="Reduza dúvidas comuns antes da compra."
            icon={<QuestionSvg />}
          >
            <FAQList items={data.faq} onChange={(v) => set('faq', v)} />
          </Section>

          {/* 11. SEO */}
          <Section
            number={11}
            title="SEO"
            subtitle="Como o produto aparece no Google e nas redes sociais."
            icon={<GlobeSvg />}
          >
            <SeoSection
              title={data.metaTitle ?? ''}
              description={data.metaDescription ?? ''}
              slug={data.slug}
              productName={data.name}
              onTitleChange={(v) => set('metaTitle', v)}
              onDescChange={(v) => set('metaDescription', v)}
            />
          </Section>
        </div>

        {/* ─────── Sidebar ─────── */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
          <SidebarCard title="Publicação">
            <div className="space-y-2">
              {(
                [
                  { v: 'ACTIVE', label: 'Ativo', tone: 'emerald', hint: 'Visível na loja' },
                  { v: 'DRAFT', label: 'Rascunho', tone: 'amber', hint: 'Não aparece na loja' },
                  { v: 'INACTIVE', label: 'Inativo', tone: 'slate', hint: 'Escondido no admin' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.v}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    data.status === opt.v
                      ? 'border-brand-500 bg-brand-50/50'
                      : 'border-ink-100 hover:border-ink-300'
                  }`}
                >
                  <input
                    type="radio"
                    checked={data.status === opt.v}
                    onChange={() => set('status', opt.v)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusDot tone={opt.tone} />
                      <span className="font-semibold text-ink-900">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-ink-500">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-ink-100 px-3 py-2.5 text-sm hover:border-ink-300">
              <input
                type="checkbox"
                checked={data.featured}
                onChange={(e) => set('featured', e.target.checked)}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <p className="font-semibold text-ink-900">Destacar na home</p>
                <p className="text-[11px] text-ink-500">
                  Aparece em &ldquo;Novidades para sua viagem&rdquo;
                </p>
              </div>
            </label>
          </SidebarCard>

          <SidebarCard title="Organização">
            <div className="grid gap-3">
              <Field
                label="Categoria"
                required
                compact
                hint="Obrigatória para publicar."
              >
                <select
                  value={data.categoryId ?? ''}
                  onChange={(e) => set('categoryId', e.target.value)}
                  className="field-input"
                >
                  <option value="">Selecione...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Selo" compact hint="Etiqueta destacada no card do produto.">
                <select
                  value={data.badge ?? ''}
                  onChange={(e) => set('badge', e.target.value)}
                  className="field-input"
                >
                  <option value="">Nenhum</option>
                  <option value="novo">Novidade</option>
                  <option value="promo">Oferta</option>
                  <option value="destaque">Destaque</option>
                </select>
              </Field>

              <Field
                label="Posição manual"
                compact
                hint="Ordem usada quando a coleção é exibida com sort=manual (menor aparece primeiro)."
              >
                <input
                  type="number"
                  value={data.position}
                  onChange={(e) => set('position', Number(e.target.value))}
                  className="field-input"
                />
              </Field>
            </div>
          </SidebarCard>

          <SidebarCard title="Resumo">
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <ResumeItem
                label="Preço"
                value={data.price > 0 ? formatCurrency(data.price) : '—'}
              />
              <ResumeItem
                label="Desconto"
                value={hasDiscount ? `${discountPct}%` : '—'}
                tone={hasDiscount ? 'emerald' : undefined}
              />
              <ResumeItem
                label="Estoque"
                value={String(data.stock)}
                tone={data.stock === 0 ? 'amber' : undefined}
              />
              <ResumeItem label="Imagens" value={String(data.images.length)} />
              <ResumeItem
                label="Benefícios"
                value={String(data.benefits.filter(Boolean).length)}
              />
              <ResumeItem
                label="FAQs"
                value={String(data.faq.filter((f) => f.question).length)}
              />
            </dl>

            {missingForPublish && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                Para publicar, preencha nome, SKU, categoria e preço. Enquanto
                isso, você pode salvar como rascunho a qualquer momento.
              </p>
            )}
            {data.status === 'DRAFT' && (
              <p className="mt-3 rounded-lg bg-ink-100/60 px-3 py-2 text-[11px] text-ink-700">
                Rascunho: pode ser salvo mesmo sem preço, SKU ou categoria — o
                produto não aparece na loja até você mudar para &ldquo;Ativo&rdquo;.
              </p>
            )}
          </SidebarCard>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={pending}
              className="btn-primary h-11 w-full text-base"
            >
              {pending
                ? 'Salvando...'
                : productId
                  ? 'Salvar alterações'
                  : 'Criar produto'}
            </button>

            {/* Botão "Salvar como rascunho" sempre disponível — força status
                DRAFT e ignora validação de publicação. Vale tanto pra novo
                quanto pra edição (útil pra tirar produto do ar sem perder
                dados). */}
            <button
              type="button"
              disabled={pending}
              onClick={(e) => submit(e, 'DRAFT')}
              className="btn-outline w-full"
            >
              Salvar como rascunho
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin/produtos')}
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
            >
              Voltar sem salvar
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
};

// ─────────────────────────── Section wrapper ───────────────────────────

const Section = ({
  number,
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"
        >
          {icon}
        </span>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
            {String(number).padStart(2, '0')}
          </span>
          <h2 className="text-base font-bold leading-tight text-ink-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children}
  </section>
);

const SidebarCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
    <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
      {title}
    </h2>
    {children}
  </section>
);

const Field = ({
  label,
  hint,
  required,
  compact,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) => (
  <div>
    <label className={`field-label ${compact ? '!mb-1' : ''}`}>
      {label} {required && <span className="text-rose-600">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-ink-500">{hint}</p>}
  </div>
);

const StatusDot = ({ tone }: { tone: 'emerald' | 'amber' | 'slate' }) => (
  <span
    aria-hidden
    className={`inline-block h-2 w-2 rounded-full ${
      tone === 'emerald'
        ? 'bg-emerald-500'
        : tone === 'amber'
          ? 'bg-amber-500'
          : 'bg-slate-400'
    }`}
  />
);

const ResumeItem = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'emerald' | 'amber';
}) => (
  <div>
    <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</dt>
    <dd
      className={`mt-0.5 text-sm font-bold ${
        tone === 'emerald'
          ? 'text-emerald-700'
          : tone === 'amber'
            ? 'text-amber-700'
            : 'text-ink-900'
      }`}
    >
      {value}
    </dd>
  </div>
);

const CharCounter = ({
  value,
  min,
  max,
  className,
}: {
  value: string;
  min: number;
  max: number;
  className?: string;
}) => {
  const len = value.length;
  const state = len === 0 ? 'empty' : len < min ? 'low' : len > max ? 'high' : 'ok';
  const color =
    state === 'ok'
      ? 'text-emerald-700'
      : state === 'high'
        ? 'text-rose-600'
        : 'text-ink-500';
  return (
    <div className={`flex items-center justify-between text-[11px] ${className ?? ''}`}>
      <span className={color}>
        {len} caracteres · ideal entre {min} e {max}
      </span>
    </div>
  );
};

// ─────────────────────────── SEO section ───────────────────────────

const SeoSection = ({
  title,
  description,
  slug,
  productName,
  onTitleChange,
  onDescChange,
}: {
  title: string;
  description: string;
  slug: string;
  productName: string;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
}) => {
  const previewTitle = title || productName || 'Título do produto';
  const previewDesc = description || 'Descrição curta que ajuda o cliente a decidir.';
  const previewUrl = `traveltech.com.br › produto › ${slug || 'seu-produto'}`;

  return (
    <div className="grid gap-4">
      <Field
        label="SEO Title"
        hint="Aparece na aba do navegador e como título do resultado no Google."
      >
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="field-input"
          placeholder={productName || 'Título otimizado para busca'}
        />
        <CharCounter
          value={title}
          min={SEO_TITLE_IDEAL[0]}
          max={SEO_TITLE_IDEAL[1]}
          className="mt-1"
        />
      </Field>

      <Field
        label="SEO Description"
        hint="Resumo mostrado abaixo do título no Google. Convença o clique."
      >
        <textarea
          rows={3}
          value={description}
          onChange={(e) => onDescChange(e.target.value)}
          className="field-input"
          placeholder="Resumo direto do produto, com um argumento de venda."
        />
        <CharCounter
          value={description}
          min={SEO_DESC_IDEAL[0]}
          max={SEO_DESC_IDEAL[1]}
          className="mt-1"
        />
      </Field>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
          Preview no Google
        </p>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <p className="text-xs text-emerald-800">{previewUrl}</p>
          <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab]">{previewTitle}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-700">{previewDesc}</p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────── Variações ───────────────────────────

type OptionEntry = ProductInput['variantOptions'][number];
type VariantEntry = ProductInput['variants'][number];

const VariationsBuilder = ({
  options,
  variants,
  onOptionsChange,
  onVariantChange,
}: {
  options: OptionEntry[];
  variants: VariantEntry[];
  onOptionsChange: (next: OptionEntry[]) => void;
  onVariantChange: (idx: number, patch: Partial<VariantEntry>) => void;
}) => {
  const addOption = () =>
    onOptionsChange([...options, { name: '', values: [{ value: '', imageUrl: null }] }]);

  const updateOption = (idx: number, patch: Partial<OptionEntry>) =>
    onOptionsChange(options.map((o, i) => (i === idx ? { ...o, ...patch } : o)));

  const removeOption = (idx: number) =>
    onOptionsChange(options.filter((_, i) => i !== idx));

  const optionNames = options.map((o) => o.name).filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Dicas de uso */}
      <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/60 p-3">
        <InfoSvg />
        <div className="text-xs text-brand-900">
          <p className="font-semibold">Como funcionam as variações</p>
          <p className="mt-0.5">
            <strong>Exemplo:</strong> Nome da opção = &ldquo;Cor&rdquo;. Valores = &ldquo;Branco&rdquo;,
            &ldquo;Preto&rdquo;, &ldquo;Azul&rdquo;.
          </p>
          <p className="mt-0.5">
            Cada combinação de valores gera uma variante com preço, SKU e estoque próprios.
            Use imagem no valor quando uma cor, modelo ou capacidade tiver foto própria — na
            loja, ao selecionar o valor a foto principal muda.
          </p>
        </div>
      </div>

      {/* Opções */}
      <div className="space-y-3">
        {options.map((opt, idx) => (
          <div key={idx} className="rounded-xl border border-ink-100 bg-ink-100/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <Field
                label={`Opção ${idx + 1} · Nome`}
                compact
                hint="Ex.: Cor, Tamanho, Voltagem, Capacidade"
              >
                <input
                  value={opt.name}
                  onChange={(e) => updateOption(idx, { name: e.target.value })}
                  placeholder="Ex.: Cor"
                  className="field-input"
                />
              </Field>
              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="btn-outline mt-6 h-9 shrink-0 whitespace-nowrap text-xs text-rose-600"
              >
                Remover opção
              </button>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
                Valores da opção
              </p>
              <ValueList
                values={opt.values}
                onChange={(vs) => updateOption(idx, { values: vs })}
                optionName={opt.name || `Opção ${idx + 1}`}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addOption}
          className="btn-outline inline-flex items-center gap-1.5 text-xs"
        >
          + Adicionar opção
        </button>
      </div>

      {/* Combinações */}
      {variants.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
              Combinações · {variants.length}
            </p>
          </div>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto rounded-xl border border-ink-100 lg:block">
            <table className="w-full text-sm">
              <thead className="bg-ink-100/40 text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Imagem</th>
                  <th className="px-3 py-2 text-left font-semibold">Variação</th>
                  <th className="px-3 py-2 text-left font-semibold">SKU</th>
                  <th className="px-3 py-2 text-left font-semibold">Preço</th>
                  <th className="px-3 py-2 text-left font-semibold">Estoque</th>
                  <th className="px-3 py-2 text-left font-semibold">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, idx) => (
                  <tr key={idx} className="border-t border-ink-100 align-middle">
                    <td className="px-3 py-2">
                      <VariantImageCell
                        url={v.imageUrl ?? null}
                        onChange={(url) => onVariantChange(idx, { imageUrl: url })}
                        variantTitle={v.title}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {optionNames.map((name) => (
                          <span
                            key={name}
                            className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700"
                          >
                            {v.optionsMap[name] ?? '—'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={v.sku}
                        onChange={(e) => onVariantChange(idx, { sku: e.target.value })}
                        className="field-input h-8 font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={v.price}
                        onChange={(e) =>
                          onVariantChange(idx, { price: Number(e.target.value) })
                        }
                        className="field-input h-8 w-24 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={v.stock}
                        onChange={(e) =>
                          onVariantChange(idx, { stock: Number(e.target.value) })
                        }
                        className="field-input h-8 w-20 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={v.active}
                        onChange={(e) =>
                          onVariantChange(idx, { active: e.target.checked })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/tablet: cards */}
          <ul className="space-y-3 lg:hidden">
            {variants.map((v, idx) => (
              <li
                key={idx}
                className={`rounded-xl border border-ink-100 bg-white p-3 ${
                  v.active ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <VariantImageCell
                    url={v.imageUrl ?? null}
                    onChange={(url) => onVariantChange(idx, { imageUrl: url })}
                    variantTitle={v.title}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1">
                      {optionNames.map((name) => (
                        <span
                          key={name}
                          className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700"
                        >
                          {name}: {v.optionsMap[name] ?? '—'}
                        </span>
                      ))}
                    </div>
                    <label className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-700">
                      <input
                        type="checkbox"
                        checked={v.active}
                        onChange={(e) =>
                          onVariantChange(idx, { active: e.target.checked })
                        }
                      />
                      Ativo na loja
                    </label>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Field label="SKU" compact>
                    <input
                      value={v.sku}
                      onChange={(e) => onVariantChange(idx, { sku: e.target.value })}
                      className="field-input h-9 font-mono text-xs"
                    />
                  </Field>
                  <Field label="Preço" compact>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={v.price}
                      onChange={(e) =>
                        onVariantChange(idx, { price: Number(e.target.value) })
                      }
                      className="field-input h-9 text-xs"
                    />
                  </Field>
                  <Field label="Estoque" compact>
                    <input
                      type="number"
                      min={0}
                      value={v.stock}
                      onChange={(e) =>
                        onVariantChange(idx, { stock: Number(e.target.value) })
                      }
                      className="field-input h-9 text-xs"
                    />
                  </Field>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Miniatura + upload por variante. Reaproveita a rota /api/admin/upload
 * (mesma que ProductImagesField usa) — sem lógica duplicada de storage.
 *
 * Sem imagem: bloco pontilhado 56x56 com CTA "Adicionar imagem".
 * Com imagem: thumb 56x56 + hover overlay com "Trocar" e "Remover".
 * Enquanto envia: overlay opaco com spinner rotativo.
 * Falha: mensagem inline abaixo, curta.
 */
const VariantImageCell = ({
  url,
  onChange,
  variantTitle,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
  variantTitle: string;
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    // Cria input file efêmero para não precisar de useRef + JSX escondido
    // dentro da tabela (30 variantes = 30 inputs invisíveis desperdiçados).
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = 'image/png,image/jpeg,image/webp,image/avif';
    el.onchange = async () => {
      const file = el.files?.[0];
      if (!file) return;
      setError(null);
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha no upload');
        onChange(data.url as string);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro no upload');
      } finally {
        setUploading(false);
      }
    };
    el.click();
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {url ? (
        <div className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-100 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Imagem da variante ${variantTitle}`}
            className="h-full w-full object-cover"
          />
          <div
            className={`absolute inset-0 flex items-center justify-center gap-1 bg-ink-900/70 transition-opacity ${
              uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {uploading ? (
              <Spinner />
            ) : (
              <>
                <button
                  type="button"
                  onClick={openPicker}
                  aria-label="Trocar imagem da variante"
                  title="Trocar"
                  className="rounded p-1 text-white hover:bg-white/20"
                >
                  <SwapSvg />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  aria-label="Remover imagem da variante"
                  title="Remover"
                  className="rounded p-1 text-white hover:bg-rose-500"
                >
                  <TrashSvg />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={uploading}
          title="Opcional. Use quando a variante tiver foto própria."
          aria-label="Adicionar imagem da variante"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border-2 border-dashed border-ink-300 bg-ink-100/30 text-ink-500 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
        >
          {uploading ? (
            <Spinner />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          )}
        </button>
      )}
      {error && (
        <span className="max-w-[120px] text-[10px] leading-tight text-rose-600">
          {error}
        </span>
      )}
      <span className="sr-only">
        {url ? 'Imagem da variante carregada' : 'Sem imagem — opcional'}
      </span>
    </div>
  );
};

const Spinner = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className="animate-spin"
    aria-hidden
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const SwapSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 7h11l-3-3M20 17H9l3 3" />
  </svg>
);

const TrashSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14M10 11v6M14 11v6" />
  </svg>
);

type OptionValueEntry = OptionEntry['values'][number];

/**
 * Lista vertical de valores da opção — cada linha:
 *   [imagem 48x48 opcional] [input nome] [remover]
 *
 * Substitui o antigo ChipInput porque agora cada valor pode ter imageUrl.
 */
const ValueList = ({
  values,
  onChange,
  optionName,
}: {
  values: OptionValueEntry[];
  onChange: (next: OptionValueEntry[]) => void;
  optionName: string;
}) => {
  const update = (idx: number, patch: Partial<OptionValueEntry>) =>
    onChange(values.map((v, i) => (i === idx ? { ...v, ...patch } : v)));

  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));

  const add = () => onChange([...values, { value: '', imageUrl: null }]);

  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <VariantImageCell
            url={v.imageUrl ?? null}
            onChange={(url) => update(i, { imageUrl: url })}
            variantTitle={`${optionName}: ${v.value || 'valor'}`}
          />
          <input
            value={v.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="Ex.: Branco"
            className="field-input h-10"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="btn-outline h-10 shrink-0 whitespace-nowrap text-xs text-rose-600"
            aria-label={`Remover valor ${v.value || i + 1}`}
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="btn-outline inline-flex h-8 items-center gap-1 text-xs"
      >
        + Adicionar valor
      </button>
    </div>
  );
};

// ─────────────────────────── Listas dinâmicas ───────────────────────────

function DynamicList({
  items,
  onChange,
  placeholder,
  addLabel = 'Adicionar',
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-200 bg-ink-100/30 p-3 text-xs text-ink-500">
          Nenhum item ainda. Clique em &ldquo;{addLabel}&rdquo; para começar.
        </p>
      )}
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-xs font-bold text-ink-500">
            {i + 1}
          </span>
          <input
            value={it}
            onChange={(e) => {
              const next = items.slice();
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className="field-input"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="btn-outline shrink-0 text-xs text-rose-600"
            aria-label="Remover"
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="btn-outline h-8 text-xs"
      >
        + {addLabel}
      </button>
    </div>
  );
}

function SpecsList({
  items,
  onChange,
}: {
  items: { name: string; value: string }[];
  onChange: (next: { name: string; value: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-200 bg-ink-100/30 p-3 text-xs text-ink-500">
          Nenhuma especificação ainda. Adicione atributos técnicos do produto.
        </p>
      )}
      {items.map((it, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={it.name}
            onChange={(e) => {
              const next = items.slice();
              next[i] = { ...it, name: e.target.value };
              onChange(next);
            }}
            placeholder="Nome (ex.: Resolução)"
            className="field-input"
          />
          <input
            value={it.value}
            onChange={(e) => {
              const next = items.slice();
              next[i] = { ...it, value: e.target.value };
              onChange(next);
            }}
            placeholder="Valor (ex.: 4K 60fps)"
            className="field-input"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="btn-outline text-xs text-rose-600"
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { name: '', value: '' }])}
        className="btn-outline h-8 text-xs"
      >
        + Adicionar especificação
      </button>
    </div>
  );
}

function FAQList({
  items,
  onChange,
}: {
  items: { question: string; answer: string }[];
  onChange: (next: { question: string; answer: string }[]) => void;
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-200 bg-ink-100/30 p-3 text-xs text-ink-500">
          Nenhuma pergunta ainda. Antecipe as dúvidas mais comuns dos clientes.
        </p>
      )}
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-ink-100 p-3">
          <input
            value={it.question}
            onChange={(e) => {
              const next = items.slice();
              next[i] = { ...it, question: e.target.value };
              onChange(next);
            }}
            placeholder="Pergunta"
            className="field-input"
          />
          <textarea
            value={it.answer}
            onChange={(e) => {
              const next = items.slice();
              next[i] = { ...it, answer: e.target.value };
              onChange(next);
            }}
            rows={2}
            placeholder="Resposta"
            className="field-input mt-2"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="btn-outline mt-2 h-8 text-xs text-rose-600"
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { question: '', answer: '' }])}
        className="btn-outline h-8 text-xs"
      >
        + Adicionar pergunta
      </button>
    </div>
  );
}

// ─────────────────────────── Ícones inline ───────────────────────────

const Svg = ({
  children,
  size = 18,
  className,
}: {
  children: React.ReactNode;
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {children}
  </svg>
);

const InfoSvg = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v5h1" />
  </Svg>
);
const DocSvg = () => (
  <Svg>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6M8 13h8M8 17h5" />
  </Svg>
);
const ImageSvg = () => (
  <Svg>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="M21 15l-5-5-9 9" />
  </Svg>
);
const PriceSvg = () => (
  <Svg>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Svg>
);
const GridSvg = () => (
  <Svg>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </Svg>
);
const CheckListSvg = () => (
  <Svg>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
  </Svg>
);
const ListSvg = () => (
  <Svg>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </Svg>
);
const BoxSvg = () => (
  <Svg>
    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
    <path d="M3 8l9 5 9-5M12 13v9" />
  </Svg>
);
const ShieldSvg = () => (
  <Svg>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);
const QuestionSvg = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5M12 17h.01" />
  </Svg>
);
const GlobeSvg = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
  </Svg>
);
const CheckBadgeSvg = ({ size = 14 }: { size?: number }) => (
  <Svg size={size}>
    <path d="m9 12 2 2 4-4" />
    <circle cx="12" cy="12" r="9" />
  </Svg>
);
const AlertSvg = ({ size = 18, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
);
