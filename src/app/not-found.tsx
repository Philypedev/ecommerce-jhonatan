import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink-900 md:text-4xl">
        Página não encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        O endereço acessado não existe ou foi movido. Volte para a vitrine ou fale conosco no WhatsApp.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Voltar para a loja
      </Link>
    </div>
  );
}
