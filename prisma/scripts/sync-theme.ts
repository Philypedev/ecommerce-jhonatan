/**
 * Aplica as cores do design atual (definidas em src/app/globals.css) no
 * registro vivo de StoreSettings, SEM tocar no catálogo nem nas mensagens.
 *
 * Uso: tsx prisma/scripts/sync-theme.ts
 *
 * Quando rodar: depois de alterar os defaults estáticos (globals.css/schema)
 * para refletir a mudança imediatamente no banco em vez de esperar o admin
 * abrir /admin/personalizacao e salvar.
 */
try {
  process.loadEnvFile();
} catch {
  /* env opcional */
}

import { PrismaClient } from '@prisma/client';

const THEME = {
  primaryColor: '#007396',
  // Os demais ficam comentados para não sobrescrever customizações do admin.
  // Descomente se também quiser forçá-los para o default.
  // secondaryColor: '#0369a1',
  // accentColor: '#22c55e',
  // backgroundColor: '#f8fafc',
  // textColor: '#0f172a',
};

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.storeSettings.upsert({
    where: { id: 'singleton' },
    update: THEME,
    create: { id: 'singleton', ...THEME },
  });
  console.log('Theme atualizado:', {
    primaryColor: updated.primaryColor,
    secondaryColor: updated.secondaryColor,
    accentColor: updated.accentColor,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
