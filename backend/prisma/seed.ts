import { PrismaClient, ListingCondition } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
  { name: 'OPPO', slug: 'oppo' },
  { name: 'vivo', slug: 'vivo' },
  { name: 'realme', slug: 'realme' },
  { name: 'Infinix', slug: 'infinix' },
];

const API_PUBLIC_URL = process.env.API_PUBLIC_URL || 'http://localhost:3000';
const assetUrl = (path: string) => `${API_PUBLIC_URL}/assets/seed/${path}`;
const phoneImageUrl = (index: number) => assetUrl(`phones/phone-${String(index).padStart(2, '0')}.jpg`);
const profileImageUrl = (index: number) => assetUrl(`profiles/profile-${String(index).padStart(2, '0')}.jpg`);

const SELLERS = [
  ['Miguel Santos', 'miguel.santos', 'Quezon City'],
  ['Angela Reyes', 'angela.reyes', 'Makati City'],
  ['Carlo Mendoza', 'carlo.mendoza', 'Pasig City'],
  ['Bea Garcia', 'bea.garcia', 'Manila'],
  ['Joshua Cruz', 'joshua.cruz', 'Taguig City'],
  ['Nicole Ramos', 'nicole.ramos', 'Mandaluyong'],
  ['Daniel Flores', 'daniel.flores', 'Caloocan'],
  ['Patricia Lim', 'patricia.lim', 'Marikina'],
  ['Kevin Tan', 'kevin.tan', 'Parañaque'],
  ['Sofia Navarro', 'sofia.navarro', 'Las Piñas'],
  ['Adrian Bautista', 'adrian.bautista', 'Cebu City'],
  ['Camille Aquino', 'camille.aquino', 'Davao City'],
  ['Mark Villanueva', 'mark.villanueva', 'Antipolo'],
  ['Jasmine Torres', 'jasmine.torres', 'Baguio City'],
  ['Paolo Castillo', 'paolo.castillo', 'Iloilo City'],
  ['Trisha dela Cruz', 'trisha.delacruz', 'Bacolod City'],
  ['Ryan Domingo', 'ryan.domingo', 'Cagayan de Oro'],
  ['Erika Sy', 'erika.sy', 'San Juan City'],
  ['Nathan Ong', 'nathan.ong', 'Valenzuela'],
  ['Faith Mercado', 'faith.mercado', 'General Santos'],
] as const;

const PHONES: Array<{
  brand: string;
  model: string;
  price: number;
  condition: ListingCondition;
  storage: string;
  colour: string;
  description: string;
}> = [
  { brand: 'Apple', model: 'iPhone 13', price: 24500, condition: 'excellent', storage: '128GB', colour: 'Midnight', description: 'Well-kept iPhone 13 with smooth performance, clear cameras, and no repair history.' },
  { brand: 'Samsung', model: 'Galaxy S23', price: 28500, condition: 'like_new', storage: '256GB', colour: 'Phantom Black', description: 'Galaxy S23 in near-new condition with complete box, cable, and original receipt.' },
  { brand: 'Google', model: 'Pixel 7', price: 17500, condition: 'good', storage: '128GB', colour: 'Obsidian', description: 'Pixel 7 with clean Android software, excellent camera quality, and normal signs of use.' },
  { brand: 'Xiaomi', model: 'Redmi Note 13 Pro', price: 11900, condition: 'excellent', storage: '256GB', colour: 'Midnight Black', description: 'Redmi Note 13 Pro with fast charging, bright display, and complete accessories.' },
  { brand: 'OnePlus', model: 'OnePlus 11', price: 21900, condition: 'good', storage: '256GB', colour: 'Titan Black', description: 'Fast and responsive OnePlus 11 with minor frame marks and strong battery life.' },
  { brand: 'Apple', model: 'iPhone 12', price: 17800, condition: 'good', storage: '128GB', colour: 'Blue', description: 'Unlocked iPhone 12 with Face ID working, original display, and 86 percent battery health.' },
  { brand: 'Samsung', model: 'Galaxy A55 5G', price: 16900, condition: 'like_new', storage: '256GB', colour: 'Awesome Navy', description: 'Almost-new Galaxy A55 5G with box, charger, case, and tempered glass installed.' },
  { brand: 'OPPO', model: 'Reno 11 5G', price: 15500, condition: 'excellent', storage: '256GB', colour: 'Wave Green', description: 'Reno 11 5G with clean body, sharp portrait camera, and reliable all-day battery.' },
  { brand: 'vivo', model: 'V30 5G', price: 18500, condition: 'excellent', storage: '256GB', colour: 'Petals White', description: 'Vivo V30 5G with AMOLED display, complete accessories, and no hidden issues.' },
  { brand: 'realme', model: '12 Pro+ 5G', price: 17200, condition: 'good', storage: '256GB', colour: 'Submarine Blue', description: 'Realme 12 Pro+ with periscope camera, fast charging, and light scratches on the case.' },
  { brand: 'Infinix', model: 'Zero 30 5G', price: 12800, condition: 'excellent', storage: '256GB', colour: 'Golden Hour', description: 'Infinix Zero 30 5G with smooth display, strong cameras, and complete retail package.' },
  { brand: 'Huawei', model: 'nova 11', price: 13900, condition: 'good', storage: '256GB', colour: 'Green', description: 'Huawei nova 11 with slim design, good battery condition, and minor cosmetic wear.' },
  { brand: 'Motorola', model: 'Edge 40', price: 14600, condition: 'excellent', storage: '256GB', colour: 'Eclipse Black', description: 'Motorola Edge 40 with clean software, curved OLED screen, and included protective case.' },
  { brand: 'Nokia', model: 'G42 5G', price: 7200, condition: 'good', storage: '128GB', colour: 'So Grey', description: 'Nokia G42 5G in good working condition with dependable battery and clean screen.' },
  { brand: 'Apple', model: 'iPhone 14 Pro', price: 38900, condition: 'excellent', storage: '256GB', colour: 'Deep Purple', description: 'iPhone 14 Pro with original parts, responsive cameras, and 90 percent battery health.' },
  { brand: 'Samsung', model: 'Galaxy Z Flip5', price: 31900, condition: 'like_new', storage: '256GB', colour: 'Graphite', description: 'Galaxy Z Flip5 with tight hinge, clean inner display, and complete original packaging.' },
  { brand: 'Google', model: 'Pixel 8', price: 26900, condition: 'excellent', storage: '128GB', colour: 'Hazel', description: 'Pixel 8 with excellent camera performance, clean screen, and international unlocked unit.' },
  { brand: 'Xiaomi', model: '13T Pro', price: 22900, condition: 'good', storage: '512GB', colour: 'Alpine Blue', description: 'Xiaomi 13T Pro with large storage, fast charging, and minor wear near the charging port.' },
  { brand: 'OnePlus', model: 'Nord 3 5G', price: 14300, condition: 'excellent', storage: '256GB', colour: 'Misty Green', description: 'OnePlus Nord 3 with smooth performance, original charger, and scratch-free display.' },
  { brand: 'Samsung', model: 'Galaxy S22 Ultra', price: 27900, condition: 'good', storage: '256GB', colour: 'Burgundy', description: 'Galaxy S22 Ultra with working S Pen, strong zoom camera, and normal frame wear.' },
];

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!adminEmail || !password || password.length < 12) {
    throw new Error('Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD with a password of at least 12 characters before seeding');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: 'admin', displayName: 'PocketTrade Admin', profileImage: profileImageUrl(2), accountStatus: 'active' },
    create: { email: adminEmail, passwordHash, role: 'admin', displayName: 'PocketTrade Admin', profileImage: profileImageUrl(2), accountStatus: 'active' },
  });

  console.log(`Admin ready: ${admin.email}`);
}

async function main() {
  for (const brand of BRANDS) {
    await prisma.brand.upsert({ where: { slug: brand.slug }, update: { name: brand.name }, create: brand });
  }

  await seedAdmin();

  const buyerEmail = process.env.SEED_BUYER_EMAIL?.trim().toLowerCase() || 'buyer@pockettrade.local';
  const buyer = await prisma.user.upsert({
    where: { email: buyerEmail },
    update: { displayName: 'Life Lessheart', profileImage: profileImageUrl(1), location: 'Quezon City', accountStatus: 'active', role: 'user' },
    create: { email: buyerEmail, displayName: 'Life Lessheart', profileImage: profileImageUrl(1), location: 'Quezon City', accountStatus: 'active', role: 'user' },
  });

  const sellers = [];
  for (let i = 0; i < SELLERS.length; i += 1) {
    const [displayName, emailPrefix, location] = SELLERS[i];
    const seller = await prisma.user.upsert({
      where: { email: `${emailPrefix}@pockettrade.local` },
      update: { displayName, profileImage: profileImageUrl(i + 3), location, accountStatus: 'active', role: 'user' },
      create: { email: `${emailPrefix}@pockettrade.local`, displayName, profileImage: profileImageUrl(i + 3), location, accountStatus: 'active', role: 'user' },
    });
    sellers.push(seller);
  }

  await prisma.listing.deleteMany({ where: { sellerId: { in: sellers.map((seller) => seller.id) } } });

  const listings = [];
  for (let i = 0; i < sellers.length; i += 1) {
    const seller = sellers[i];
    const phone = PHONES[i];
    const listing = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        brand: phone.brand,
        model: phone.model,
        price: phone.price,
        condition: phone.condition,
        storage: phone.storage,
        colour: phone.colour,
        description: phone.description,
        location: seller.location || 'Metro Manila',
        status: 'active',
        createdAt: new Date(Date.now() - i * 3_600_000),
        images: {
          create: [
            { imageUrl: phoneImageUrl(i * 2 + 1), displayOrder: 0 },
            { imageUrl: phoneImageUrl(i * 2 + 2), displayOrder: 1 },
          ],
        },
      },
      include: { images: true },
    });
    listings.push(listing);
  }

  await prisma.favorite.deleteMany({ where: { userId: buyer.id } });
  await prisma.favorite.createMany({
    data: listings.slice(0, 10).map((listing) => ({ userId: buyer.id, listingId: listing.id })),
    skipDuplicates: true,
  });

  for (let i = 0; i < 8; i += 1) {
    const listing = listings[i];
    const seller = sellers[i];
    const conversation = await prisma.conversation.upsert({
      where: {
        listingId_buyerId_sellerId: {
          listingId: listing.id,
          buyerId: buyer.id,
          sellerId: seller.id,
        },
      },
      update: { lastMessageAt: new Date(Date.now() - i * 600_000) },
      create: {
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: seller.id,
        lastMessageAt: new Date(Date.now() - i * 600_000),
      },
    });

    await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: buyer.id,
          content: `Hi, is the ${listing.brand} ${listing.model} still available?`,
          isRead: true,
          createdAt: new Date(Date.now() - (i + 3) * 3_600_000),
        },
        {
          conversationId: conversation.id,
          senderId: seller.id,
          content: 'Yes, it is still available. You can inspect it before buying.',
          isRead: true,
          createdAt: new Date(Date.now() - (i + 2) * 3_600_000),
        },
        {
          conversationId: conversation.id,
          senderId: buyer.id,
          content: 'Great. Is the posted price still negotiable?',
          isRead: i < 4,
          createdAt: new Date(Date.now() - (i + 1) * 3_600_000),
        },
      ],
    });
  }

  const counts = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: '@pockettrade.local' } } }),
    prisma.listing.count({ where: { sellerId: { in: sellers.map((seller) => seller.id) } } }),
    prisma.conversation.count({ where: { buyerId: buyer.id } }),
    prisma.message.count({ where: { conversation: { buyerId: buyer.id } } }),
  ]);

  console.log(`Seed complete: ${counts[0]} local users, ${counts[1]} listings, ${counts[2]} chats, ${counts[3]} messages`);
  console.log(`Demo buyer email: ${buyer.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
