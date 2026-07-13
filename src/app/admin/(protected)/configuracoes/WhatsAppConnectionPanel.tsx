'use client';

import { AlertIcon, CheckIcon, WhatsAppIcon } from '@/components/ui/Icon';
import { useToast } from '@/components/admin/Toaster';

type Props = {
  number: string;
  display: string;
};

const TEST_MESSAGE =
  '*Teste de configuração — painel admin TravelTech*\n\nOlá! Esta é uma mensagem automática gerada pelo botão "Testar conexão WhatsApp" do painel administrativo.\n\nSe você está vendo esta conversa, o número configurado está correto e os clientes conseguirão finalizar pedidos por este WhatsApp.';

const cleanDigits = (n: string) => n.replace(/\D/g, '');

const validateNumber = (raw: string): { ok: boolean; reason?: string } => {
  const digits = cleanDigits(raw);
  if (digits.length === 0) return { ok: false, reason: 'Informe o número.' };
  if (digits.length < 10) return { ok: false, reason: 'Número muito curto (use formato internacional com DDI + DDD).' };
  if (digits.length > 15) return { ok: false, reason: 'Número longo demais (máx. 15 dígitos).' };
  // Brasil: 55 + 2 dígitos DDD + 8 ou 9 dígitos
  if (digits.startsWith('55') && digits.length < 12) {
    return { ok: false, reason: 'Faltam dígitos: 55 + DDD (2) + número (8 ou 9).' };
  }
  return { ok: true };
};

export const WhatsAppConnectionPanel = ({ number, display }: Props) => {
  const toast = useToast();
  const digits = cleanDigits(number);
  const { ok, reason } = validateNumber(number);
  const url = ok ? `https://wa.me/${digits}?text=${encodeURIComponent(TEST_MESSAGE)}` : null;

  const handleOpen = () => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Conversa de teste aberta em nova aba. Confirme que o WhatsApp está respondendo no número certo.');
  };

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <WhatsAppIcon size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ink-900">Conectar / testar conexão</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Abra a conversa do número configurado em uma nova aba para confirmar que o WhatsApp
            está respondendo. Esse é exatamente o link que o cliente usa ao finalizar a compra.
          </p>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink-700">Número:</span>
              <span className="font-mono text-ink-900">{digits || '—'}</span>
              {display && <span className="text-ink-500">· exibido como {display}</span>}
            </div>

            {ok ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink-700">Link gerado:</span>
                  <code className="break-all rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-brand-700">
                    {`https://wa.me/${digits}`}
                  </code>
                </div>
                <p className="inline-flex items-center gap-1.5 text-emerald-700">
                  <CheckIcon size={14} className="text-emerald-700" aria-hidden />
                  Formato válido
                </p>
              </>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-rose-700">
                <AlertIcon size={14} className="text-rose-700" aria-hidden />
                {reason}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!ok}
              onClick={handleOpen}
              className="btn-accent disabled:opacity-50"
            >
              <WhatsAppIcon size={18} />
              Abrir conversa de teste
            </button>
            <span className="text-xs text-ink-500">
              Não envia mensagem automaticamente — só abre a conversa pronta.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
