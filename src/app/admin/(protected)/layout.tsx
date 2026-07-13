import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStoreSettings } from '@/lib/db/settings';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.uid },
      select: { name: true, email: true },
    }),
    getStoreSettings().catch(() => null),
  ]);

  return (
    <AdminShell
      user={{ email: session.email, name: user?.name }}
      brand={{
        shortName: settings?.shortName ?? 'TravelTech',
        logoUrl: settings?.logoUrl ?? null,
      }}
    >
      {children}
    </AdminShell>
  );
}
