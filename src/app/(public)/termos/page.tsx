import type { Metadata } from 'next';
import { getPageContent } from '@/lib/db/pages';
import { InstitutionalPage } from '@/components/institutional/InstitutionalPage';

export const revalidate = 300;

const FALLBACK = {
  title: 'Termos de uso',
  content: `Estes termos regulam o uso do nosso site e o processo de compra que ocorre via WhatsApp.

## Aceitação

Ao navegar e enviar um pedido pelo site, você concorda com estes termos.

## Pedidos

O envio de um pedido por este site é uma manifestação de interesse de compra. A confirmação efetiva acontece após nosso time validar disponibilidade, prazo e pagamento pelo WhatsApp.

## Preços e produtos

Nos esforçamos para manter informações de preço, estoque e descrição sempre atualizadas, mas podem ocorrer alterações sem aviso prévio.

## Pagamento

Nenhum valor é cobrado diretamente neste site. O pagamento é combinado pelo WhatsApp e somente os canais oficiais informados por nossa equipe devem ser utilizados.

## Limitação de responsabilidade

Não nos responsabilizamos por danos decorrentes de uso inadequado dos produtos ou por informações incorretas fornecidas pelo cliente.

## Foro

Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer questões relativas a estes termos.`,
};

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent('termos');
  return {
    title: page?.metaTitle || FALLBACK.title,
    description:
      page?.metaDescription ||
      'Termos e condições de uso da loja TravelTech.',
  };
};

export default async function TermsPage() {
  const page = await getPageContent('termos');
  return (
    <InstitutionalPage
      title={page?.title || FALLBACK.title}
      subtitle="Regras claras para uma compra tranquila."
      content={page?.content || FALLBACK.content}
    />
  );
}
