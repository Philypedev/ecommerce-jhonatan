'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEventHandler,
  type ReactNode,
} from 'react';

type Placement = 'right' | 'left' | 'center';

type Props = {
  /** Rótulo curto do que o tooltip explica (usado no aria-label). */
  label: string;
  /** Conteúdo do tooltip. Idealmente 1-3 frases curtas. */
  children: ReactNode;
  /** Tamanho do ícone "?". `md` padrão. */
  size?: 'sm' | 'md';
};

/**
 * Ícone pequeno de ajuda ("?") que exibe uma explicação curta ao passar o
 * mouse, focar (teclado) ou tocar (mobile). Fecha ao clicar/tocar fora ou
 * apertar ESC.
 *
 * Comportamento por dispositivo:
 *  - mouse: hover abre, mouseleave fecha
 *  - teclado: focus abre, blur fecha
 *  - touch: click toggle (nada de hover em touch)
 *
 * Sem lib. Sem portal. Bounding-box do wrapper decide se o balão abre para
 * a direita, para a esquerda ou centralizado — evita cortar em mobile.
 */
export const HelpTooltip = ({ label, children, size = 'md' }: Props) => {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>('right');
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  const iconCls = size === 'sm' ? 'h-3.5 w-3.5 text-[9px]' : 'h-4 w-4 text-[10px]';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Escolhe a melhor direção horizontal para não estourar viewport.
  // Precisa rodar depois da renderização do balão pra o rect estar correto.
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    // 280px é o max-width do balão. Sobra 16px de folga.
    if (spaceRight >= 260) setPlacement('right');
    else if (spaceLeft >= 260) setPlacement('left');
    else setPlacement('center');
  }, [open]);

  // Hover só em mouse — evita o "double-tap fantasma" em touch.
  const onEnter: PointerEventHandler<HTMLSpanElement> = (e) => {
    if (e.pointerType === 'mouse') setOpen(true);
  };
  const onLeave: PointerEventHandler<HTMLSpanElement> = (e) => {
    if (e.pointerType === 'mouse') setOpen(false);
  };

  const tooltipPos =
    placement === 'right'
      ? 'left-0'
      : placement === 'left'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex align-middle"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <button
        type="button"
        aria-label={`Ajuda: ${label}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={(e) => {
          // Evita que o click bolhe até um <label> pai e refoca o input.
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`ml-1 grid ${iconCls} shrink-0 place-items-center rounded-full bg-ink-100 font-bold normal-case tracking-normal text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40`}
      >
        ?
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`absolute top-full mt-2 z-30 w-max max-w-[280px] rounded-lg border border-ink-100 bg-white p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-700 shadow-cardHover animate-fade-in ${tooltipPos}`}
        >
          {children}
        </span>
      )}
    </span>
  );
};
