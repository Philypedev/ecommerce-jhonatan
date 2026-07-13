const FALLBACK_MESSAGES = [
  'Entrega para todo o Brasil',
  'Parcelamento em até 12x sem juros',
  'Atendimento humano via WhatsApp',
  'Compra segura com suporte humano',
  'Envio rápido e rastreado',
  'Produtos úteis para sua próxima viagem',
  'Viaje com mais praticidade e segurança',
];

export const RotatingTrustBar = ({ messages }: { messages: string[] }) => {
  const items = messages.length > 0 ? messages : FALLBACK_MESSAGES;
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Benefícios da loja"
      className="relative w-full overflow-hidden border-y border-ink-100 bg-gradient-to-r from-white via-brand-50/50 to-white"
    >
      {/* fio de cor no topo, dá um detalhe premium */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-700/40 to-transparent"
      />

      <div className="marquee">
        <div className="marquee-track">
          {/* lista canônica (lida por screen readers) */}
          <ul className="marquee-list">
            {items.map((msg, i) => (
              <li key={`a-${i}`} className="marquee-item">
                <span className="marquee-text">{msg}</span>
                <span className="marquee-sep" aria-hidden>
                  •
                </span>
              </li>
            ))}
          </ul>
          {/* duplicata visual para loop contínuo */}
          <ul className="marquee-list" aria-hidden="true">
            {items.map((msg, i) => (
              <li key={`b-${i}`} className="marquee-item">
                <span className="marquee-text">{msg}</span>
                <span className="marquee-sep" aria-hidden>
                  •
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
