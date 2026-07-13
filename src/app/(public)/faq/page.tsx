import type { Metadata } from 'next';
import { getPageContent } from '@/lib/db/pages';
import { InstitutionalPage } from '@/components/institutional/InstitutionalPage';

export const revalidate = 300;

const FALLBACK = {
  title: 'Perguntas frequentes',
  content: `Reunimos as dúvidas mais comuns sobre como funciona a compra na TravelTech.

## Como funciona a finalização pelo WhatsApp?

Você monta seu pedido no site (escolhe produtos, preenche dados e forma de pagamento) e ao clicar em "Finalizar pelo WhatsApp", abrimos uma conversa com nossa equipe trazendo todos os dados já organizados. A confirmação final é feita por uma pessoa real.

## O pagamento é feito pelo site?

Não. Nenhum valor é cobrado neste site. Após a confirmação do pedido pelo WhatsApp, enviamos os dados oficiais (PIX, link de cartão, boleto etc.) e o pagamento acontece fora do site.

## Como funciona o frete?

O frete é calculado e confirmado pelo nosso time durante o atendimento pelo WhatsApp, considerando o CEP de destino e a forma de envio mais adequada para o seu pedido.

## Vocês entregam para todo o Brasil?

Sim. Trabalhamos com transportadoras parceiras e com os Correios para entregar em todo o território nacional.

## Como acompanho meu pedido?

Assim que o pedido é despachado, enviamos o código de rastreio pelo WhatsApp. Você acompanha diretamente no site da transportadora.

## Posso retirar o produto?

Sim, oferecemos retirada agendada na nossa loja física. Selecione a opção "Retirada" no checkout para combinarmos data e horário.

## Como funciona troca e garantia?

Você pode solicitar troca em até 7 dias corridos após o recebimento. Para defeitos cobertos pela garantia do fabricante (12 meses para a maioria dos produtos), basta nos chamar no WhatsApp que orientamos o processo.`,
};

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent('faq');
  return {
    title: page?.metaTitle || 'FAQ — Perguntas frequentes',
    description:
      page?.metaDescription ||
      'Tire suas dúvidas sobre frete, pagamento e funcionamento da loja TravelTech.',
  };
};

export default async function FAQPage() {
  const page = await getPageContent('faq');
  return (
    <InstitutionalPage
      title={page?.title || FALLBACK.title}
      subtitle="Tudo o que você precisa saber antes de comprar."
      content={page?.content || FALLBACK.content}
    />
  );
}
