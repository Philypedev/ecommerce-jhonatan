/**
 * Cria (ou atualiza) o usuário `comercial@traveltech2.com` no banco.
 *
 * Idempotente — se já existir, sobrescreve nome e re-hasheia a senha. Não
 * é destrutivo: nenhum outro usuário é tocado.
 *
 * Uso:
 *   COMERCIAL_ADMIN_PASSWORD="senha-temporaria" npm run admin:create-comercial
 *
 * A senha NÃO fica hardcoded neste arquivo. Ler de `COMERCIAL_ADMIN_PASSWORD`
 * torna o script seguro para versionar e evita expor credenciais no repo.
 * O usuário deve trocar a senha em `/admin/conta` no primeiro login — depois
 * disso o hash bcrypt no banco é o que vale.
 */
try {
  process.loadEnvFile();
} catch {
  /* .env opcional em envs que já injetam variáveis */
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const EMAIL = 'comercial@traveltech2.com';
const NAME = 'Comercial';
const ROLE = 'ADMIN';

async function main() {
  const rawPassword = process.env.COMERCIAL_ADMIN_PASSWORD;
  if (!rawPassword || rawPassword.trim().length === 0) {
    console.error(
      '[create-comercial] Defina COMERCIAL_ADMIN_PASSWORD para criar/atualizar o usuário comercial.',
    );
    console.error('');
    console.error('  Exemplo:');
    console.error(
      '    COMERCIAL_ADMIN_PASSWORD="senha-temporaria" npm run admin:create-comercial',
    );
    process.exit(1);
  }

  const password = rawPassword.trim();
  const prisma = new PrismaClient();
  try {
    const normalizedEmail = EMAIL.toLowerCase().trim();
    // Mesmo custo de bcrypt do resto do sistema (seed + changePasswordAction)
    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, role: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { email: normalizedEmail },
        data: { name: NAME, passwordHash, role: ROLE },
      });
      console.log(
        `[create-comercial] usuário existente atualizado: ${normalizedEmail}`,
      );
      console.log('  → senha re-hashada com o valor de COMERCIAL_ADMIN_PASSWORD.');
    } else {
      await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: NAME,
          passwordHash,
          role: ROLE,
        },
      });
      console.log(`[create-comercial] usuário criado: ${normalizedEmail}`);
    }

    console.log('');
    console.log(`E-mail do usuário: ${normalizedEmail}`);
    console.log(
      'A senha usada foi lida de COMERCIAL_ADMIN_PASSWORD — não é ecoada nesta',
    );
    console.log('saída para evitar vazamento em logs de terminal / CI.');
    console.log('');
    console.log(
      'IMPORTANTE: peça ao usuário para trocar a senha em /admin/conta assim',
    );
    console.log(
      'que fizer o primeiro login. O hash bcrypt fica no banco — depois disso',
    );
    console.log('a variável de ambiente não vale mais para autenticação.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[create-comercial] falha:', e);
  process.exit(1);
});
