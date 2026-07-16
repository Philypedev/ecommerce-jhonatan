/**
 * Cria (ou atualiza) um usuário admin genérico no banco.
 *
 * Reutilizável para qualquer usuário do painel — basta setar as variáveis
 * `NEW_ADMIN_EMAIL`, `NEW_ADMIN_PASSWORD` e opcionalmente `NEW_ADMIN_NAME`
 * no ambiente. Idempotente: se o email já existir, sobrescreve nome +
 * re-hasheia a senha. Nunca deleta outros usuários.
 *
 * Uso:
 *   NEW_ADMIN_EMAIL="alguem@dominio.com" NEW_ADMIN_PASSWORD="senha-temporaria" \
 *     NEW_ADMIN_NAME="Nome opcional" npm run admin:create-user
 *
 * `NEW_ADMIN_NAME` é opcional — se ausente, deriva do local-part do email
 * (parte antes do `@`) capitalizando a primeira letra.
 *
 * A senha NÃO fica hardcoded neste arquivo NEM é ecoada na saída. O usuário
 * deve trocar a senha em `/admin/conta` no primeiro login — depois disso o
 * hash bcrypt no banco é o que vale, e a variável de ambiente pode ser
 * removida do ambiente.
 *
 * NOTA sobre naming: as variáveis usam o prefixo `NEW_` de propósito. O
 * projeto já tem `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` no `.env`,
 * consumidas pelo seed do admin default. O `@prisma/client` carrega o
 * `.env` automaticamente ao ser importado — se este script lesse as
 * mesmas variáveis, o operador poderia inadvertidamente sobrescrever o
 * admin principal ao invocá-lo sem argumentos. Usar `NEW_*` isola o
 * contrato e obriga passar a intenção explicitamente na linha de comando.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const ROLE = 'ADMIN';

function usage(): never {
  console.error(
    '[create-admin] Faltam NEW_ADMIN_EMAIL e/ou NEW_ADMIN_PASSWORD para criar/atualizar o usuário.',
  );
  console.error('');
  console.error('  Exemplo:');
  console.error(
    '    NEW_ADMIN_EMAIL="alguem@dominio.com" NEW_ADMIN_PASSWORD="senha-temporaria" \\',
  );
  console.error('      NEW_ADMIN_NAME="Nome opcional" npm run admin:create-user');
  process.exit(1);
}

/**
 * Deriva um nome sensato quando ADMIN_NAME não é fornecido:
 * "jhonatamsantos36@gmail.com" → "Jhonatamsantos36"
 */
function deriveDefaultName(email: string): string {
  const local = email.split('@')[0] ?? 'Admin';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

async function main() {
  const rawEmail = process.env.NEW_ADMIN_EMAIL?.trim();
  const rawPassword = process.env.NEW_ADMIN_PASSWORD;

  if (!rawEmail || !rawPassword || rawPassword.trim().length === 0) {
    usage();
  }

  // Validação mínima de formato do email — se falhar, o Prisma também falharia
  // depois, mas aqui devolvemos mensagem clara antes de tocar no banco.
  const email = rawEmail.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(
      `[create-admin] NEW_ADMIN_EMAIL inválido: "${rawEmail}". Use um email no formato "user@dominio.com".`,
    );
    process.exit(1);
  }

  const password = rawPassword.trim();
  const name = (process.env.NEW_ADMIN_NAME?.trim() || deriveDefaultName(email));

  const prisma = new PrismaClient();
  try {
    // Mesmo custo de bcrypt do resto do sistema
    // (seed + changePasswordAction + create-comercial).
    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    let status: 'created' | 'updated';
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { name, passwordHash, role: ROLE },
      });
      status = 'updated';
    } else {
      await prisma.user.create({
        data: { email, name, passwordHash, role: ROLE },
      });
      status = 'created';
    }

    console.log(`[create-admin] ${status === 'created' ? 'usuário criado' : 'usuário existente atualizado'}: ${email}`);
    console.log(`  status: ${status}`);
    console.log(`  role:   ${ROLE}`);
    console.log(`  nome:   ${name}`);
    console.log('');
    console.log(
      'A senha foi lida de NEW_ADMIN_PASSWORD e NÃO é ecoada nesta saída para',
    );
    console.log('evitar vazamento em logs de terminal / CI.');
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
  console.error('[create-admin] falha:', e);
  process.exit(1);
});
