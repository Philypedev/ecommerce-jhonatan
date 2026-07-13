import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { isUsingDefaultPassword } from '@/app/actions/account';
import { AlertIcon } from '@/components/ui/Icon';
import { ChangePasswordForm } from './ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function AdminAccountPage() {
  const session = await requireAdmin();
  const [user, isDefault] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.uid },
      select: { name: true, email: true, createdAt: true, updatedAt: true },
    }),
    isUsingDefaultPassword(session.uid),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Minha conta</h1>
        <p className="text-sm text-ink-500">
          Atualize a senha de acesso ao painel administrativo.
        </p>
      </div>

      {isDefault && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="inline-flex items-center gap-2 font-bold">
            <AlertIcon size={16} className="text-amber-700" aria-hidden />
            Você está usando a senha padrão (admin123).
          </p>
          <p className="mt-1">
            Troque agora por uma senha forte. Senhas padrão são o vetor de ataque mais comum
            em painéis administrativos.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">Dados da conta</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-500">Nome</dt>
            <dd className="font-medium text-ink-900">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">E-mail</dt>
            <dd className="font-medium text-ink-900">{user?.email}</dd>
          </div>
        </dl>
      </section>

      <ChangePasswordForm />
    </div>
  );
}
