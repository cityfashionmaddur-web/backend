import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.product.findFirst({ where: { title: { contains: 'Jogger' } }, include: { variants: true } });
  console.log("Joggers product:", JSON.stringify(p, null, 2));

  const orders = await prisma.order.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { id: 'desc' },
    take: 3
  });
  console.log("Recent orders:", JSON.stringify(orders, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
