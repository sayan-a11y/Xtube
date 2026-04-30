import { db } from '../src/lib/db'

async function seed() {
  // Create default categories
  const categories = ['Action', 'Drama', 'Sci-Fi', 'Comedy', 'Thriller', 'Horror', 'Romance', 'Documentary']

  for (const name of categories) {
    try {
      await db.category.upsert({
        where: { name },
        update: {},
        create: { name },
      })
      console.log(`Category "${name}" created`)
    } catch (err) {
      console.log(`Category "${name}" already exists or error`)
    }
  }

  console.log('Seed complete! Categories are ready.')
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect())
