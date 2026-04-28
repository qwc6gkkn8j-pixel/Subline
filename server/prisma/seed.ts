import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@subline.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const name = process.env.ADMIN_NAME ?? 'Admin';
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, rounds);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'admin',
      status: 'active',
      fullName: name,
    },
  });
  console.log(`Created admin: ${user.email} (id=${user.id})`);
  console.log(`Login with password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
