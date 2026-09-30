import { pool } from '../src/db/pool';
import { seedDatabase } from '../tests/fixtures/seed';

async function run() {
  console.log("Starting DB seed...");
  try {
    await seedDatabase();
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  } finally {
    process.exit(0);
  }
}

run();
