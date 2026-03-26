import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { id: 'desc' },
    take: 5
  });
  console.log("ALL ORDERS in DB:", JSON.stringify(orders, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
