import type { ReactNode } from 'react';
import { createElement, Fragment } from 'react';

/**
 * Renderer de markdown MUITO enxuto (sem deps).
 * Suporta: `## h2`, `### h3`, listas `- item`, **negrito**, [texto](link)
 * e parágrafos separados por linha em branco. Suficiente para páginas
 * institucionais editáveis no admin (Sobre, Políticas, etc.).
 */

const INLINE_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

const renderInline = (text: string, baseKey: string): ReactNode => {
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    if (match[1] != null) {
      out.push(createElement('strong', { key: `${baseKey}-b-${i++}` }, match[1]));
    } else if (match[2] != null && match[3] != null) {
      const href = match[3];
      const isExternal = /^https?:\/\//i.test(href);
      out.push(
        createElement(
          'a',
          {
            key: `${baseKey}-a-${i++}`,
            href,
            className: 'font-semibold text-brand-700 hover:underline',
            target: isExternal ? '_blank' : undefined,
            rel: isExternal ? 'noreferrer' : undefined,
          },
          match[2],
        ),
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out.length > 0 ? createElement(Fragment, null, ...out) : text;
};

export const renderMarkdown = (raw: string): ReactNode => {
  if (!raw || !raw.trim()) return null;
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let blockKey = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const txt = paragraph.join(' ').trim();
    paragraph = [];
    if (!txt) return;
    blocks.push(
      createElement(
        'p',
        { key: `p-${blockKey}`, className: 'leading-relaxed text-ink-700' },
        renderInline(txt, `p-${blockKey}`),
      ),
    );
    blockKey++;
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems.slice();
    listItems = [];
    blocks.push(
      createElement(
        'ul',
        { key: `ul-${blockKey}`, className: 'space-y-1.5 pl-5 text-ink-700' },
        ...items.map((it, i) =>
          createElement(
            'li',
            { key: `li-${blockKey}-${i}`, className: 'list-disc leading-relaxed' },
            renderInline(it, `li-${blockKey}-${i}`),
          ),
        ),
      ),
    );
    blockKey++;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push(
        createElement(
          'h2',
          {
            key: `h2-${blockKey}`,
            className: 'mt-2 text-xl font-bold text-ink-900 md:text-2xl',
          },
          renderInline(line.slice(3), `h2-${blockKey}`),
        ),
      );
      blockKey++;
    } else if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push(
        createElement(
          'h3',
          {
            key: `h3-${blockKey}`,
            className: 'mt-1 text-base font-semibold text-ink-900',
          },
          renderInline(line.slice(4), `h3-${blockKey}`),
        ),
      );
      blockKey++;
    } else if (line.startsWith('- ')) {
      flushParagraph();
      listItems.push(line.slice(2));
    } else if (line === '') {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();

  return createElement(
    'div',
    { className: 'space-y-4 text-sm md:text-[15px]' },
    ...blocks,
  );
};
