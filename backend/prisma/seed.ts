import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const BRANDS = [
  { name: 'Apple', slug: 'apple' },
  { name: 'Samsung', slug: 'samsung' },
  { name: 'Google', slug: 'google' },
  { name: 'Xiaomi', slug: 'xiaomi' },
  { name: 'OnePlus', slug: 'oneplus' },
  { name: 'Huawei', slug: 'huawei' },
  { name: 'Motorola', slug: 'motorola' },
  { name: 'Nokia', slug: 'nokia' },
];

async function main() {
  for (const brand of BRANDS) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name },
      create: brand,
    });
  }
  console.log(`Upserted ${BRANDS.length} brands`);

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@example.com';
  let password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  let generated = false;
  if (!password || password === 'replace_with_random_password' || password.length < 8) {
    password = crypto.randomBytes(18).toString('base64url');
    generated = true;
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: await bcrypt.hash(password, 10),
      role: 'admin',
      displayName: 'Administrator',
      accountStatus: 'active',
    },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'admin',
      displayName: 'Administrator',
      accountStatus: 'active',
    },
  });
  console.log(`Admin user upserted: id=${admin.id} email=${admin.email}`);

  if (generated) {
    console.log('');
    console.log('============================================================');
    console.log('  ADMIN BOOTSTRAP PASSWORD (generated, NOT stored in env)');
    console.log('============================================================');
    console.log(`  email:    ${adminEmail}`);
    console.log(`  password: ${password}`);
    console.log('============================================================');
  } else {
    console.log('Admin password loaded from ADMIN_BOOTSTRAP_PASSWORD env');
  }

  const [brandCount, adminCount] = await Promise.all([
    prisma.brand.count(),
    prisma.user.count({ where: { role: 'admin' } }),
  ]);
  console.log(`Final: ${brandCount} brands, ${adminCount} admin user(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
