// @ts-nocheck  — script legado (importador one-shot). Depende do pacote `xlsx`
// que foi removido do package.json por conter CVE HIGH sem patch. Ver §16.3
// do DEPLOY.md. TypeScript é desligado neste arquivo para não bloquear o
// build principal do site.
/**
 * Importador dos 142 produtos DJI a partir de `data/catalogo_dji_para_ecommerce.xlsx`.
 *
 * ⚠️ REQUER `xlsx` INSTALADO. O pacote foi REMOVIDO de `package.json` durante o
 *    hardening pré-produção (CVE HIGH sem patch). Para rodar este script:
 *
 *        npm i --no-save xlsx
 *        npm run db:import-dji-products
 *        npm ci        # limpa xlsx do disco
 *
 *    O script continua no repo como legado documentado — veja DEPLOY.md §16.3.
 *
 * Regras principais (definidas com o cliente):
 *  - Idempotente: identifica produtos por SKU, cria ou atualiza (nunca duplica).
 *  - Todos entram como DRAFT — o cliente revisa e publica manualmente.
 *  - Preço vem SÓ da coluna "Preço no site". Custos/margens ficam de fora.
 *  - Categorias são upsertadas com posições sequenciais na ordem em que
 *    aparecem no catálogo.
 *  - Estoque vazio vira 0, preço antigo vazio vira null.
 *  - Ao atualizar produtos existentes, imagens NÃO são apagadas (a planilha
 *    não traz imagens, então preservamos qualquer foto que o admin tenha
 *    subido depois).
 *  - Variações da planilha são anotadas na descrição — não geramos ProductVariant
 *    automaticamente (regra do cliente).
 *
 * Uso:
 *   npm run db:import-dji-products             # importa de verdade
 *   npm run db:import-dji-products:dry         # dry-run (não escreve)
 *   npx tsx prisma/scripts/import-dji-products.ts --deactivate-non-dji
 *     └ opcional: marca como INACTIVE todos os produtos que não estão na
 *       planilha (não deleta nada — pedidos antigos continuam íntegros).
 */
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'node:path';
import { slugify } from '../../src/lib/slug';

try {
  process.loadEnvFile();
} catch {
  /* env opcional */
}

const DRY_RUN = process.argv.includes('--dry-run');
const DEACTIVATE_NON_DJI = process.argv.includes('--deactivate-non-dji');
const XLSX_PATH = path.resolve(
  process.cwd(),
  'data/catalogo_dji_para_ecommerce.xlsx',
);

// ─────────────────────── Tipos das linhas da planilha ───────────────────────

type Cell = string | number | null | undefined;

type MainRow = {
  Ordem: Cell;
  'Status da ficha': Cell;
  Publicação: Cell;
  Categoria: Cell;
  'Nome do produto': Cell;
  Slug: Cell;
  SKU: Cell;
  Marca: Cell;
  'Descrição curta': Cell;
  'Descrição completa': Cell;
  'Preço no site': Cell;
  'Preço antigo': Cell;
  Parcelas: Cell;
  Estoque: Cell;
  Variações: Cell;
  Garantia: Cell;
  'SEO title': Cell;
  'SEO description': Cell;
  'Página(s) no catálogo': Cell;
  'Página na lista de preço': Cell;
  'Observações / revisão': Cell;
  'Fonte catálogo': Cell;
  'Fonte preço': Cell;
};

type DetailRow = {
  Ordem: Cell;
  SKU: Cell;
  'Nome do produto': Cell;
  Benefícios: Cell;
  'Especificações técnicas': Cell;
  'Conteúdo da embalagem': Cell;
  'Perguntas frequentes': Cell;
  Garantia: Cell;
  'Status da ficha': Cell;
  'Página(s) no catálogo': Cell;
  'Observações / revisão': Cell;
};

// ─────────────────────── Helpers de normalização ───────────────────────

const asStr = (v: Cell): string => (v == null ? '' : String(v)).trim();

const asNum = (v: Cell): number | null => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/**
 * Benefícios vêm como "• item 1\n• item 2\n...". Cada linha vira um item.
 * Aceita variações de bullet: •, -, *.
 */
const parseBenefits = (raw: Cell): string[] => {
  const text = asStr(raw);
  if (!text) return [];
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*[•\-*]\s*/, '').trim())
    .filter(Boolean);
};

/**
 * FAQ vem como "1. Pergunta? Resposta.\n2. Pergunta? Resposta." — split por
 * "\d+\.\s" no início da linha, depois separa por primeiro "?".
 * Se não conseguir parsear e ainda houver texto, salva como uma FAQ genérica.
 */
const parseFAQ = (raw: Cell): { question: string; answer: string }[] => {
  const text = asStr(raw);
  if (!text) return [];
  const chunks = text.split(/(?:^|\n)(?=\d+\.\s)/).filter(Boolean);
  const out: { question: string; answer: string }[] = [];
  for (const chunk of chunks) {
    const cleaned = chunk.replace(/^\d+\.\s*/, '').trim();
    const qMark = cleaned.indexOf('?');
    if (qMark === -1) continue;
    const question = cleaned.slice(0, qMark + 1).trim();
    const answer = cleaned.slice(qMark + 1).trim();
    if (question && answer) out.push({ question, answer });
  }
  if (out.length === 0 && text.length > 3) {
    out.push({ question: 'Dúvidas frequentes', answer: text });
  }
  return out;
};

/**
 * Anexa a ficha técnica (texto livre) ao final da descrição completa. O
 * cliente pediu para preservar quebras de linha e NÃO tentar tabelar
 * automaticamente — texto contínuo cai melhor no card "Sobre o produto"
 * (whitespace-pre-line) do que no `dl` de especificações.
 */
const appendTechToDescription = (
  fullDescription: string,
  techText: string,
): string => {
  const spec = techText.trim();
  if (!spec) return fullDescription;
  const separator = '\n\n---\nEspecificações técnicas\n---\n';
  return fullDescription
    ? `${fullDescription}${separator}${spec}`
    : `Especificações técnicas\n\n${spec}`;
};

// ─────────────────────── Categorias ───────────────────────

const CATEGORY_ICON = 'tag';

/**
 * Uma variação com maiúsculas/acentos diferentes é a MESMA categoria. Usamos
 * slugify para chave canônica.
 */
const canonKey = (name: string): string => slugify(name);

// ─────────────────────── Main ───────────────────────

type Stats = {
  read: number;
  created: number;
  updated: number;
  catsCreated: number;
  catsReused: number;
  withCatalog: number;
  pending: number;
  noPrice: number;
  noCategory: number;
  noSku: number;
  errors: { sku: string; row: number; message: string }[];
};

async function main() {
  console.log(
    `\n▸ Importando DJI ${DRY_RUN ? '(DRY-RUN)' : ''}${
      DEACTIVATE_NON_DJI ? ' + desativação de não-DJI' : ''
    }...\n`,
  );

  const wb = XLSX.readFile(XLSX_PATH);

  const requiredSheets = ['Cadastro principal', 'Conteúdo detalhado'];
  for (const s of requiredSheets) {
    if (!wb.SheetNames.includes(s)) {
      throw new Error(
        `Aba obrigatória ausente: "${s}". Abas encontradas: ${wb.SheetNames.join(', ')}`,
      );
    }
  }

  const mainRows = XLSX.utils.sheet_to_json<MainRow>(
    wb.Sheets['Cadastro principal'],
    { defval: null },
  );
  const detailRows = XLSX.utils.sheet_to_json<DetailRow>(
    wb.Sheets['Conteúdo detalhado'],
    { defval: null },
  );

  const detailBySku = new Map<string, DetailRow>();
  for (const d of detailRows) {
    const sku = asStr(d.SKU).toUpperCase();
    if (sku) detailBySku.set(sku, d);
  }

  const prisma = new PrismaClient();

  const stats: Stats = {
    read: mainRows.length,
    created: 0,
    updated: 0,
    catsCreated: 0,
    catsReused: 0,
    withCatalog: 0,
    pending: 0,
    noPrice: 0,
    noCategory: 0,
    noSku: 0,
    errors: [],
  };

  try {
    // ────────── 1. Upsert de categorias ──────────
    // Ordem: primeira aparição na aba "Cadastro principal", preservada.
    const seenCategories = new Map<string, string>(); // canon → display
    for (const row of mainRows) {
      const cat = asStr(row.Categoria);
      if (!cat) continue;
      const key = canonKey(cat);
      if (!seenCategories.has(key)) seenCategories.set(key, cat);
    }

    const categoryIdByCanon = new Map<string, string>();
    let catPosition = 1;
    for (const [canon, displayName] of seenCategories) {
      const existing = await prisma.category.findFirst({ where: { slug: canon } });
      if (existing) {
        categoryIdByCanon.set(canon, existing.id);
        stats.catsReused++;
      } else {
        if (DRY_RUN) {
          categoryIdByCanon.set(canon, `DRY_${canon}`);
        } else {
          const created = await prisma.category.create({
            data: {
              name: displayName,
              slug: canon,
              description: `Coleção ${displayName}`,
              icon: CATEGORY_ICON,
              status: 'ACTIVE',
              position: catPosition,
              highlight: false,
            },
          });
          categoryIdByCanon.set(canon, created.id);
        }
        stats.catsCreated++;
      }
      catPosition++;
    }

    // ────────── 2. Produtos ──────────
    for (let idx = 0; idx < mainRows.length; idx++) {
      const row = mainRows[idx];
      const rowNum = idx + 2; // +1 header, +1 zero-based → planilha

      const sku = asStr(row.SKU).toUpperCase();
      const name = asStr(row['Nome do produto']);
      let slug = asStr(row.Slug).toLowerCase();
      const categoryName = asStr(row.Categoria);
      const price = asNum(row['Preço no site']);

      // Validações obrigatórias
      if (!sku) {
        stats.noSku++;
        stats.errors.push({
          sku: '(vazio)',
          row: rowNum,
          message: 'SKU obrigatório — linha ignorada.',
        });
        continue;
      }
      if (!name) {
        stats.errors.push({ sku, row: rowNum, message: 'Nome obrigatório.' });
        continue;
      }
      if (!categoryName) {
        stats.noCategory++;
        stats.errors.push({ sku, row: rowNum, message: 'Categoria obrigatória.' });
        continue;
      }
      if (price == null) {
        stats.noPrice++;
        stats.errors.push({
          sku,
          row: rowNum,
          message: 'Preço no site obrigatório.',
        });
        continue;
      }
      const categoryId = categoryIdByCanon.get(canonKey(categoryName));
      if (!categoryId) {
        stats.errors.push({
          sku,
          row: rowNum,
          message: `Categoria "${categoryName}" não upsertada — bug.`,
        });
        continue;
      }

      // Contadores diagnósticos
      const fichaStatus = asStr(row['Status da ficha']).toLowerCase();
      if (fichaStatus.includes('localizada')) stats.withCatalog++;
      if (fichaStatus.includes('pendente')) stats.pending++;

      // Detalhe (join por SKU)
      const det = detailBySku.get(sku);

      // Campos escalares
      const oldPrice = asNum(row['Preço antigo']);
      const installments = asNum(row.Parcelas) ?? 12;
      const stock = asNum(row.Estoque) ?? 0;
      const brand = asStr(row.Marca) || 'DJI';
      const shortDescription = asStr(row['Descrição curta']);
      let fullDescription = asStr(row['Descrição completa']);

      // Anexa ficha técnica ao fim da descrição
      const techText = det ? asStr(det['Especificações técnicas']) : '';
      fullDescription = appendTechToDescription(fullDescription, techText);

      // Garantia: detalhe manda; fallback pro campo principal
      const warranty = (det ? asStr(det.Garantia) : '') || asStr(row.Garantia);

      // Benefícios (ProductBenefit[])
      const benefits = parseBenefits(det?.Benefícios ?? null);

      // FAQ (ProductFAQ[])
      const faq = parseFAQ(det?.['Perguntas frequentes'] ?? null);

      // Conteúdo da embalagem — string única guardada como JSON array
      const boxRaw = det ? asStr(det['Conteúdo da embalagem']) : '';
      const packageContent = boxRaw
        ? boxRaw.split('\n').map((l) => l.trim()).filter(Boolean)
        : [];

      // SEO — sem truncar; Zod só valida no admin, não aqui
      const metaTitle = asStr(row['SEO title']) || null;
      const metaDescription = asStr(row['SEO description']) || null;

      const position = asNum(row.Ordem) ?? 0;

      // Slug: usa o da planilha, gera do nome se vazio, e desambigua se colidir
      // com outro SKU já cadastrado.
      if (!slug) slug = slugify(name);
      slug = await ensureUniqueSlug(prisma, slug, sku);

      // ────────── Upsert por SKU ──────────
      try {
        const existing = await prisma.product.findFirst({
          where: { sku },
          select: { id: true },
        });

        if (DRY_RUN) {
          if (existing) stats.updated++;
          else stats.created++;
          continue;
        }

        // Uma transaction curta por produto — falha isolada, não trava a fila.
        if (existing) {
          await prisma.$transaction(
            async (tx) => {
              await tx.product.update({
                where: { id: existing.id },
                data: {
                  name,
                  slug,
                  shortDescription,
                  fullDescription,
                  price,
                  oldPrice,
                  installments,
                  stock,
                  brand,
                  status: 'DRAFT',
                  warranty,
                  packageContent: JSON.stringify(packageContent),
                  metaTitle,
                  metaDescription,
                  categoryId,
                  position,
                  // NÃO mexe em: images, featured, badge, variantes.
                },
              });
              // Reset dos filhos gerados pela planilha (imagens NÃO estão aqui).
              await tx.productBenefit.deleteMany({
                where: { productId: existing.id },
              });
              await tx.productFAQ.deleteMany({
                where: { productId: existing.id },
              });
              // Especificações vieram anexadas na descrição; se havia specs de
              // outra origem no produto, mantemos.
              if (benefits.length > 0) {
                await tx.productBenefit.createMany({
                  data: benefits.map((b, i) => ({
                    productId: existing.id,
                    text: b,
                    position: i,
                  })),
                });
              }
              if (faq.length > 0) {
                await tx.productFAQ.createMany({
                  data: faq.map((f, i) => ({
                    productId: existing.id,
                    question: f.question,
                    answer: f.answer,
                    position: i,
                  })),
                });
              }
            },
            { timeout: 15000 },
          );
          stats.updated++;
        } else {
          await prisma.product.create({
            data: {
              name,
              slug,
              shortDescription,
              fullDescription,
              price,
              oldPrice,
              installments,
              sku,
              brand,
              stock,
              status: 'DRAFT',
              featured: false,
              position,
              warranty,
              packageContent: JSON.stringify(packageContent),
              metaTitle,
              metaDescription,
              categoryId,
              benefits: {
                create: benefits.map((b, i) => ({ text: b, position: i })),
              },
              faq: {
                create: faq.map((f, i) => ({
                  question: f.question,
                  answer: f.answer,
                  position: i,
                })),
              },
            },
          });
          stats.created++;
        }
      } catch (e) {
        stats.errors.push({
          sku,
          row: rowNum,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // ────────── 3. --deactivate-non-dji (opcional) ──────────
    let deactivatedCount = 0;
    const importedSkus = new Set(
      mainRows.map((r) => asStr(r.SKU).toUpperCase()).filter(Boolean),
    );

    if (DEACTIVATE_NON_DJI && !DRY_RUN) {
      const others = await prisma.product.findMany({
        where: {
          sku: { notIn: [...importedSkus] },
          status: { not: 'INACTIVE' },
        },
        select: { id: true },
      });
      for (const o of others) {
        await prisma.product.update({
          where: { id: o.id },
          data: { status: 'INACTIVE' },
        });
        deactivatedCount++;
      }
    }

    // Normaliza posições das categorias (elimina buracos/duplicatas causadas
    // por categorias novas colidindo com posições de categorias legadas).
    if (!DRY_RUN) {
      await normalizePositions(prisma);
    }

    const nonDjiTotal = await prisma.product.count({
      where: { sku: { notIn: [...importedSkus] } },
    });

    // ────────── 4. Relatório final ──────────
    printReport(stats, {
      nonDjiTotal,
      deactivatedCount,
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Renumera todas as categorias sequencialmente por (position asc, name asc),
 * começando em 1. Espelha o helper `normalizeCategoryPositions` do runtime,
 * mas duplicado aqui pra não puxar módulos com alias `@/` no script.
 */
async function normalizePositions(prisma: PrismaClient): Promise<void> {
  const all = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { id: true, position: true },
  });
  for (let i = 0; i < all.length; i++) {
    const desired = i + 1;
    if (all[i].position !== desired) {
      await prisma.category.update({
        where: { id: all[i].id },
        data: { position: desired },
      });
    }
  }
}

/**
 * Se o slug bater com um produto de OUTRO SKU, sufixa com o SKU pra desambiguar.
 * Mantém o slug estável se for o mesmo produto (update).
 */
async function ensureUniqueSlug(
  prisma: PrismaClient,
  base: string,
  sku: string,
): Promise<string> {
  const existing = await prisma.product.findFirst({
    where: { slug: base },
    select: { sku: true },
  });
  if (!existing || existing.sku.toUpperCase() === sku.toUpperCase()) return base;
  return `${base}-${sku.toLowerCase()}`;
}

function printReport(
  s: Stats,
  extra: { nonDjiTotal: number; deactivatedCount: number },
) {
  const line = '═'.repeat(46);
  console.log(`\n╔${line}`);
  console.log(`║ RELATÓRIO DE IMPORTAÇÃO DJI${DRY_RUN ? ' (DRY-RUN)' : ''}`);
  console.log(`╠${line}`);
  console.log(`║ Linhas lidas na planilha:    ${s.read}`);
  console.log(`║ Produtos criados:            ${s.created}`);
  console.log(`║ Produtos atualizados:        ${s.updated}`);
  console.log(`║ Categorias criadas:          ${s.catsCreated}`);
  console.log(`║ Categorias reutilizadas:     ${s.catsReused}`);
  console.log(`║ Ficha localizada no catálogo:${s.withCatalog.toString().padStart(4)}`);
  console.log(`║ Pendentes ficha técnica:     ${s.pending}`);
  console.log(`║ Linhas sem preço:            ${s.noPrice}`);
  console.log(`║ Linhas sem categoria:        ${s.noCategory}`);
  console.log(`║ Linhas sem SKU:              ${s.noSku}`);
  console.log(`║ Erros:                       ${s.errors.length}`);
  console.log(`╠${line}`);
  console.log(`║ Outros produtos no banco (fora da lista DJI): ${extra.nonDjiTotal}`);
  if (DEACTIVATE_NON_DJI) {
    console.log(`║   → Desativados nesta rodada: ${extra.deactivatedCount}`);
  } else if (extra.nonDjiTotal > 0 && !DRY_RUN) {
    console.log('║   → Use --deactivate-non-dji para marcá-los como INACTIVE.');
  }
  console.log(`╚${line}`);

  if (s.errors.length > 0) {
    console.log('\n=== Erros ===');
    for (const e of s.errors.slice(0, 40)) {
      console.log(`  linha ${e.row} · SKU ${e.sku}: ${e.message}`);
    }
    if (s.errors.length > 40) {
      console.log(`  … e mais ${s.errors.length - 40}`);
    }
  }

  console.log(
    `\nTodos os produtos importados ficam como DRAFT — não aparecem na loja pública. Acesse /admin/produtos para revisar e ativar.`,
  );
}

main().catch((e) => {
  console.error('\nFalha estrutural na importação:', e);
  process.exit(1);
});
