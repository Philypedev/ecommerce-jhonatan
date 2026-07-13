import type { Metadata } from 'next';
import { getPageContent } from '@/lib/db/pages';
import { renderMarkdown } from '@/lib/markdown';

export const revalidate = 300;

const FALLBACK = {
  title: 'Políticas de entrega, troca e garantia',
  content: `Transparência em cada etapa do seu pedido. Confira nossos compromissos com você.

## Entrega

Realizamos entregas para todo o Brasil, com transportadoras parceiras e Correios. Prazos e fretes são confirmados pela equipe via WhatsApp após a finalização do pedido. Em geral, os pedidos saem para envio em até 2 dias úteis após a confirmação de pagamento. Você também pode optar pela retirada em nossa loja física, mediante agendamento.

## Troca e devolução

Você pode solicitar a troca ou devolução em até 7 dias corridos após o recebimento, conforme o Código de Defesa do Consumidor. Para produtos com defeito de fabricação dentro do prazo de garantia, faremos o reparo ou substituição sem custo, conforme análise técnica. Para iniciar a solicitação, basta nos chamar no WhatsApp.

## Garantia

Todos os produtos contam com garantia direta do fabricante. O prazo padrão é de 12 meses, salvo indicação diferente na página do produto. Acessórios e itens consumíveis possuem garantia de 3 a 6 meses, conforme indicado.

## Privacidade

Os dados que você informa em nosso site são utilizados exclusivamente para processar e confirmar o seu pedido com a nossa equipe pelo WhatsApp. Não compartilhamos dados pessoais com terceiros sem a sua autorização e seguimos boas práticas de proteção de informações.

## Pagamento

Como o pedido é finalizado pelo WhatsApp, nenhum valor é cobrado diretamente neste site. A forma de pagamento é confirmada com nossa equipe, que envia os dados oficiais (PIX, link de cartão, boleto etc.). Atenção: nunca envie pagamentos para contatos que não sejam o WhatsApp oficial da loja.`,
};

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent('politicas');
  return {
    title: page?.metaTitle || 'Políticas de entrega, troca e garantia',
    description:
      page?.metaDescription ||
      'Conheça as políticas de entrega, troca, garantia e privacidade da loja. Atendimento humano e processo transparente.',
  };
};

export default async function PoliciesPage() {
  const page = await getPageContent('politicas');
  const title = page?.title || FALLBACK.title;
  const content = page?.content || FALLBACK.content;

  return (
    <>
      <section className="bg-brand-950 text-white">
        <div className="container-x py-10">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
        </div>
      </section>

      <section className="container-x py-12">
        <article className="rounded-2xl bg-white p-8 shadow-card">
          {renderMarkdown(content)}
        </article>
      </section>
    </>
  );
}
