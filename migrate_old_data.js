import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  console.log("Starting legacy data migration...");

  try {
    // 1. Give old products a default 'STANDARD' variant if they have no variants
    const productsWithoutVariants = await prisma.product.findMany({
      where: {
        variants: { none: {} }
      }
    });

    if (productsWithoutVariants.length > 0) {
      console.log(`Found ${productsWithoutVariants.length} products without variants. Seeding 'STANDARD' variants...`);
      let variantsCreated = 0;
      for (const product of productsWithoutVariants) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            size: 'STANDARD',
            stock: 100 // Default legacy stock assignment
          }
        });
        variantsCreated++;
      }
      console.log(`Successfully created ${variantsCreated} 'STANDARD' product variants.`);
    } else {
      console.log("All products already have variants. Skipping...");
    }

    // 2. Fix old order items where size was permanently lost/null
    console.log("Cleaning up legacy order items...");
    const itemsUpdated = await prisma.orderItem.updateMany({
      where: { size: null },
      data: { size: 'STANDARD' }
    });

    console.log(`Updated ${itemsUpdated.count} legacy order items from 'null' to 'STANDARD'.`);

    console.log("Migration complete! You can safely delete this script.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
