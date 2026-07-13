import type { Metadata } from 'next';
import { getPageContent } from '@/lib/db/pages';
import { InstitutionalPage } from '@/components/institutional/InstitutionalPage';

export const revalidate = 300;

const FALLBACK = {
  title: 'Garantia',
  content: `Compromisso de procedência e suporte em todos os nossos produtos.

## Prazo padrão

A maioria dos produtos conta com 12 meses de garantia direta do fabricante. Acessórios e consumíveis podem ter prazo menor — consulte sempre a página do produto.

## O que está coberto

- Defeitos de fabricação
- Falhas em componentes eletrônicos cobertos pelo fabricante
- Problemas de funcionamento dentro do uso normal indicado

## O que não está coberto

- Mau uso, quedas, contato com líquidos fora das especificações
- Desgaste natural por uso
- Modificações não autorizadas no produto
- Itens consumíveis (pilhas, baterias, fitas etc.) após o prazo específico

## Como acionar

1. Entre em contato pelo WhatsApp informando o número do pedido ou nota fiscal.
2. Descreva o problema, com fotos ou vídeos se possível.
3. Orientamos sobre envio para análise técnica.
4. Após análise, fazemos o reparo, substituição ou reembolso, conforme o caso.

## Importante

Guarde a nota fiscal — ela é o seu comprovante de garantia.`,
};

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent('garantia');
  return {
    title: page?.metaTitle || FALLBACK.title,
    description:
      page?.metaDescription ||
      'Garantia em todos os produtos TravelTech — saiba o que está coberto e como acionar.',
  };
};

export default async function WarrantyPage() {
  const page = await getPageContent('garantia');
  return (
    <InstitutionalPage
      title={page?.title || FALLBACK.title}
      subtitle="Comprou na TravelTech, tem suporte."
      content={page?.content || FALLBACK.content}
    />
  );
}
