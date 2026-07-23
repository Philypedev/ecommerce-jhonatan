'use server';

import { prisma } from '@/lib/prisma';
import { checkoutSchema } from '@/lib/validation/schemas';
import { buildCheckoutMessageFromLines, type WhatsAppLine } from '@/utils/whatsapp';
import {
  markSessionConverted,
  markLatestSessionByVisitorConverted,
} from '@/lib/db/visitors';
import { getCustomerSession } from '@/lib/customer-auth';
import type { CheckoutData } from '@/types';

type CartItemInput = { productId: string; quantity: number; variantId?: string };

type ActionResult =
  | { ok: true; whatsappMessage: string; leadOrderId: string }
  | { ok: false; error: string };

const isValidTrackingId = (v: unknown): v is string =>
  typeof v === 'string' && v.length >= 6 && v.length <= 64;

const parseVariantOptionsMap = (raw: string): Record<string, string> | null => {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v;
      }
      return Object.keys(out).length > 0 ? out : null;
    }
  } catch {
    /* silent */
  }
  return null;
};

export async function saveLeadOrderAction(
  data: CheckoutData,
  items: CartItemInput[],
  sessionId?: string,
  visitorId?: string,
): Promise<ActionResult> {
  const parsed = checkoutSchema.safeParse({ ...data, items });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  try {
    // Puxa produtos + variantes referenciados em uma consulta cada.
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const variantIds = items
      .map((i) => i.variantId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const [products, variants] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: productIds } } }),
      variantIds.length > 0
        ? prisma.productVariant.findMany({ where: { id: { in: variantIds } } })
        : Promise.resolve([]),
    ]);
    const byProduct = new Map(products.map((p) => [p.id, p]));
    const byVariant = new Map(variants.map((v) => [v.id, v]));

    const lineItems = items
      .map((line) => {
        const product = byProduct.get(line.productId);
        if (!product) return null;
        const variant = line.variantId ? byVariant.get(line.variantId) : undefined;
        // Se o cliente enviou variantId inválido/inativo, tratamos como produto simples.
        const useVariant = variant && variant.productId === product.id && variant.active;

        const unitPrice = useVariant ? variant!.price : product.price;
        const sku = useVariant ? variant!.sku : product.sku;
        const variantTitle = useVariant ? variant!.title : null;
        const variantOptionsMap = useVariant
          ? parseVariantOptionsMap(variant!.optionsJson)
          : null;

        return {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          sku,
          quantity: line.quantity,
          unitPrice,
          subtotal: unitPrice * line.quantity,
          variantId: useVariant ? variant!.id : null,
          variantTitle,
          variantOptionsMap,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (lineItems.length === 0) {
      return { ok: false, error: 'Nenhum produto válido no carrinho.' };
    }

    const subtotal = lineItems.reduce((acc, i) => acc + i.subtotal, 0);

    const waLines: WhatsAppLine[] = lineItems.map((li) => ({
      name: li.productName,
      slug: li.productSlug,
      sku: li.sku,
      unitPrice: li.unitPrice,
      quantity: li.quantity,
      variantTitle: li.variantTitle,
      variantOptionsMap: li.variantOptionsMap,
    }));
    const whatsappMessage = buildCheckoutMessageFromLines(data, waLines);

    // Vincula ao Customer se houver sessão de cliente ativa. Guest continua
    // funcionando: `customerId` fica null e o pedido é gravado normalmente.
    const customerSession = await getCustomerSession().catch(() => null);

    const order = await prisma.leadOrder.create({
      data: {
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email || null,
        customerDocument: data.document || null,
        deliveryType: data.deliveryType,
        cep: data.cep || null,
        street: data.street || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.district || null,
        city: data.city || null,
        state: data.state || null,
        paymentMethod: data.payment,
        observations: data.notes || null,
        subtotal,
        total: subtotal,
        whatsappMessage,
        status: 'NOVO',
        customerId: customerSession?.cid ?? null,
        items: {
          create: lineItems.map((li) => ({
            productId: li.productId,
            productName: li.productName,
            sku: li.sku,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            subtotal: li.subtotal,
            variantId: li.variantId,
            variantTitle: li.variantTitle,
          })),
        },
      },
    });

    // Marca a sessão como convertida (best-effort — nunca derruba o checkout
    // se o tracking falhar ou os ids não vierem do client).
    // Prioridade: sessionId (preciso). Fallback: sessão aberta mais recente
    // do visitorId.
    try {
      let marked = false;
      if (isValidTrackingId(sessionId)) {
        marked = await markSessionConverted(sessionId, order.id);
      }
      if (!marked && isValidTrackingId(visitorId)) {
        await markLatestSessionByVisitorConverted(visitorId, order.id);
      }
    } catch {
      /* silent */
    }

    return { ok: true, whatsappMessage, leadOrderId: order.id };
  } catch (e) {
    console.error('[saveLeadOrderAction]', e);
    return { ok: false, error: 'Não foi possível salvar seu pedido. Tente novamente.' };
  }
}
