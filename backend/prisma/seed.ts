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
  // 1. Upsert all brands
  for (const b of BRANDS) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name },
      create: b,
    });
  }
  console.log(`✓ Upserted ${BRANDS.length} brands`);

  // 2. Resolve admin credentials
  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@example.com';
  let password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  let generated = false;
  if (!password || password === 'replace_with_random_password' || password.length < 8) {
    password = crypto.randomBytes(18).toString('base64url'); // ~24 chars
    generated = true;
  }

  const hash = await bcrypt.hash(password, 10);

  // 3. Upsert admin user (by mobileNumber since we don't have a separate admin table)
  // Use a sentinel mobileNumber 'admin' (or pull from env if ADMIN_BOOTSTRAP_MOBILE set)
  const adminMobile = process.env.ADMIN_BOOTSTRAP_MOBILE || 'admin';
  const admin = await prisma.user.upsert({
    where: { mobileNumber: adminMobile },
    update: {
      passwordHash: hash,
      role: 'admin',
      displayName: 'Administrator',
      accountStatus: 'active',
    },
    create: {
      mobileNumber: adminMobile,
      email: adminEmail,
      passwordHash: hash,
      role: 'admin',
      displayName: 'Administrator',
      accountStatus: 'active',
    },
  });
  console.log(`✓ Admin user upserted: id=${admin.id} mobile=${admin.mobileNumber} email=${admin.email}`);

  if (generated) {
    console.log('');
    console.log('============================================================');
    console.log('  ADMIN BOOTSTRAP PASSWORD (generated, NOT stored in env)');
    console.log('============================================================');
    console.log(`  email:    ${adminEmail}`);
    console.log(`  password: ${password}`);
    console.log('============================================================');
    console.log('  Save this password now. Set ADMIN_BOOTSTRAP_PASSWORD in');
    console.log('  your env to avoid regeneration on the next seed run.');
    console.log('============================================================');
  } else {
    console.log(`✓ Admin password loaded from ADMIN_BOOTSTRAP_PASSWORD env`);
  }

  // 4. Final counts
  const counts = await Promise.all([
    prisma.brand.count(),
    prisma.user.count({ where: { role: 'admin' } }),
  ]);
  console.log(`Final: ${counts[0]} brands, ${counts[1]} admin user(s)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());