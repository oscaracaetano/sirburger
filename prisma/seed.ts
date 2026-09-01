import { PrismaClient, ModifierType, AdminRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando carga de datos de prueba...')

  // Limpiar datos existentes en orden correcto de dependencias
  await prisma.orderStatusLog.deleteMany()
  await prisma.intervention.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.dispatch.deleteMany()
  await prisma.courier.deleteMany()
  await prisma.customerAddress.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.promotionProduct.deleteMany()
  await prisma.promotion.deleteMany()
  await prisma.recipeItem.deleteMany()
  await prisma.modifierOption.deleteMany()
  await prisma.modifierGroup.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.businessHours.deleteMany()
  await prisma.coupon.deleteMany()
  await prisma.adminUser.deleteMany()

  console.log('🗑️  Datos anteriores eliminados')

  // 1. Ingredientes
  const pan = await prisma.ingredient.create({ data: { name: 'Pan de Papa', unit: 'unidad' } })
  const carne = await prisma.ingredient.create({ data: { name: 'Medallón de Carne 120g', unit: 'unidad' } })
  const cheddar = await prisma.ingredient.create({ data: { name: 'Queso Cheddar', unit: 'g' } })
  const lechuga = await prisma.ingredient.create({ data: { name: 'Lechuga', unit: 'g' } })
  const tomate = await prisma.ingredient.create({ data: { name: 'Tomate', unit: 'g' } })
  const salsa = await prisma.ingredient.create({ data: { name: 'Salsa SirBurger', unit: 'ml' } })
  const bacon = await prisma.ingredient.create({ data: { name: 'Bacon crocante', unit: 'g' } })
  const huevo = await prisma.ingredient.create({ data: { name: 'Huevo frito', unit: 'unidad' } })
  const papas = await prisma.ingredient.create({ data: { name: 'Papas cortadas', unit: 'g' } })
  const cebolla = await prisma.ingredient.create({ data: { name: 'Aros de cebolla', unit: 'g' } })
  const cocaCola = await prisma.ingredient.create({ data: { name: 'Coca-Cola 500ml', unit: 'unidad' } })

  console.log('🥩 Ingredientes creados')

  // 2. Categorías
  const catBurgers = await prisma.category.create({
    data: { name: 'Hamburguesas', sortOrder: 1, active: true },
  })
  const catAcomp = await prisma.category.create({
    data: { name: 'Acompañamientos', sortOrder: 2, active: true },
  })
  const catBebidas = await prisma.category.create({
    data: { name: 'Bebidas', sortOrder: 3, active: true },
  })

  console.log('📁 Categorías creadas')

  // 3. Productos y Modificadores
  // Hamburguesa Clásica
  const burgerClasica = await prisma.product.create({
    data: {
      name: 'Hamburguesa Clásica',
      description: 'Pan de papa, medallón de carne 120g, cheddar, lechuga, tomate y salsa especial.',
      basePrice: 4500,
      categoryId: catBurgers.id,
      prepTimeMin: 8,
      featured: false,
      active: true,
      modifierGroups: {
        create: [
          {
            name: 'Quitar ingredientes',
            type: ModifierType.MULTI_CHOICE,
            minSelect: 0,
            sortOrder: 1,
            options: {
              create: [
                { name: 'Sin lechuga', priceDelta: 0, ingredientId: lechuga.id, qtyDelta: -10, sortOrder: 1 },
                { name: 'Sin tomate', priceDelta: 0, ingredientId: tomate.id, qtyDelta: -15, sortOrder: 2 },
                { name: 'Sin cheddar', priceDelta: 0, ingredientId: cheddar.id, qtyDelta: -20, sortOrder: 3 },
                { name: 'Sin salsa', priceDelta: 0, ingredientId: salsa.id, qtyDelta: -15, sortOrder: 4 },
              ],
            },
          },
          {
            name: 'Extras y Agregados',
            type: ModifierType.QUANTITY,
            minSelect: 0,
            sortOrder: 2,
            options: {
              create: [
                { name: 'Extra Cheddar', priceDelta: 500, maxQty: 3, ingredientId: cheddar.id, qtyDelta: 20, sortOrder: 1 },
                { name: 'Doble Carne', priceDelta: 1500, maxQty: 2, ingredientId: carne.id, qtyDelta: 1, sortOrder: 2 },
                { name: 'Bacon Crocante', priceDelta: 800, maxQty: 2, ingredientId: bacon.id, qtyDelta: 15, sortOrder: 3 },
                { name: 'Huevo Frito', priceDelta: 600, maxQty: 1, ingredientId: huevo.id, qtyDelta: 1, sortOrder: 4 },
              ],
            },
          },
        ],
      },
      recipeItems: {
        create: [
          { ingredientId: pan.id, quantity: 1 },
          { ingredientId: carne.id, quantity: 1 },
          { ingredientId: cheddar.id, quantity: 20 },
          { ingredientId: lechuga.id, quantity: 10 },
          { ingredientId: tomate.id, quantity: 15 },
          { ingredientId: salsa.id, quantity: 15 },
        ],
      },
    },
  })

  // Hamburguesa Doble Cheddar & Bacon (Destacada)
  const burgerDoble = await prisma.product.create({
    data: {
      name: 'Doble Cheddar Bacon',
      description: 'Doble medallón de 120g, cuádruple cheddar, abundante bacon y salsa BBQ casera.',
      basePrice: 5800,
      categoryId: catBurgers.id,
      prepTimeMin: 10,
      featured: true,
      active: true,
      modifierGroups: {
        create: [
          {
            name: 'Quitar ingredientes',
            type: ModifierType.MULTI_CHOICE,
            minSelect: 0,
            sortOrder: 1,
            options: {
              create: [
                { name: 'Sin cheddar', priceDelta: 0, ingredientId: cheddar.id, qtyDelta: -40, sortOrder: 1 },
                { name: 'Sin bacon', priceDelta: 0, ingredientId: bacon.id, qtyDelta: -30, sortOrder: 2 },
              ],
            },
          },
          {
            name: 'Extras y Agregados',
            type: ModifierType.QUANTITY,
            minSelect: 0,
            sortOrder: 2,
            options: {
              create: [
                { name: 'Triple Carne (+1 medallón)', priceDelta: 1500, maxQty: 1, ingredientId: carne.id, qtyDelta: 1, sortOrder: 1 },
                { name: 'Extra Cheddar', priceDelta: 500, maxQty: 3, ingredientId: cheddar.id, qtyDelta: 20, sortOrder: 2 },
                { name: 'Huevo Frito', priceDelta: 600, maxQty: 1, ingredientId: huevo.id, qtyDelta: 1, sortOrder: 3 },
              ],
            },
          },
        ],
      },
      recipeItems: {
        create: [
          { ingredientId: pan.id, quantity: 1 },
          { ingredientId: carne.id, quantity: 2 },
          { ingredientId: cheddar.id, quantity: 40 },
          { ingredientId: bacon.id, quantity: 30 },
          { ingredientId: salsa.id, quantity: 20 },
        ],
      },
    },
  })

  // Papas Fritas
  await prisma.product.create({
    data: {
      name: 'Papas Fritas Rústicas',
      description: 'Papas bastón crujientes con sal marina.',
      basePrice: 2500,
      categoryId: catAcomp.id,
      prepTimeMin: 5,
      featured: false,
      active: true,
      modifierGroups: {
        create: [
          {
            name: 'Tamaño',
            type: ModifierType.SINGLE_CHOICE,
            minSelect: 1,
            maxSelect: 1,
            sortOrder: 1,
            options: {
              create: [
                { name: 'Mediana (Regular)', priceDelta: 0, sortOrder: 1 },
                { name: 'Grande (+50%)', priceDelta: 800, ingredientId: papas.id, qtyDelta: 100, sortOrder: 2 },
              ],
            },
          },
          {
            name: 'Toppings',
            type: ModifierType.QUANTITY,
            minSelect: 0,
            sortOrder: 2,
            options: {
              create: [
                { name: 'Bañadas en Cheddar', priceDelta: 600, maxQty: 2, ingredientId: cheddar.id, qtyDelta: 30, sortOrder: 1 },
                { name: 'Bacon picado', priceDelta: 700, maxQty: 2, ingredientId: bacon.id, qtyDelta: 20, sortOrder: 2 },
              ],
            },
          },
        ],
      },
      recipeItems: {
        create: [{ ingredientId: papas.id, quantity: 200 }],
      },
    },
  })

  // Aros de Cebolla
  await prisma.product.create({
    data: {
      name: 'Aros de Cebolla',
      description: 'Aros rebozados súper crujientes con dip de salsa SirBurger.',
      basePrice: 2800,
      categoryId: catAcomp.id,
      prepTimeMin: 5,
      featured: false,
      active: true,
      recipeItems: {
        create: [
          { ingredientId: cebolla.id, quantity: 180 },
          { ingredientId: salsa.id, quantity: 30 },
        ],
      },
    },
  })

  // Bebidas
  await prisma.product.create({
    data: {
      name: 'Coca-Cola Original 500ml',
      description: 'Botella individual fría.',
      basePrice: 1500,
      categoryId: catBebidas.id,
      prepTimeMin: 0,
      featured: false,
      active: true,
      recipeItems: {
        create: [{ ingredientId: cocaCola.id, quantity: 1 }],
      },
    },
  })

  console.log('🍔 Productos y Recetas creados')

  // 4. Horarios de atención (Lunes a Jueves 19-00, Viernes-Sábado 19-01, Domingo 19-00)
  const days = [
    { dayOfWeek: 0, openTime: '19:00', closeTime: '00:00' }, // Domingo
    { dayOfWeek: 1, openTime: '19:00', closeTime: '00:00' }, // Lunes
    { dayOfWeek: 2, openTime: '19:00', closeTime: '00:00' }, // Martes
    { dayOfWeek: 3, openTime: '19:00', closeTime: '00:00' }, // Miércoles
    { dayOfWeek: 4, openTime: '19:00', closeTime: '00:00' }, // Jueves
    { dayOfWeek: 5, openTime: '19:00', closeTime: '01:00' }, // Viernes
    { dayOfWeek: 6, openTime: '19:00', closeTime: '01:00' }, // Sábado
  ]

  for (const day of days) {
    await prisma.businessHours.create({
      data: {
        ...day,
        isClosed: false,
      },
    })
  }

  console.log('⏰ Horarios de atención configurados')

  // 5. Usuario Administrador / Operadora
  const passwordHash = await bcrypt.hash('admin123', 10)
  await prisma.adminUser.create({
    data: {
      email: 'admin@sirburger.com',
      passwordHash,
      role: AdminRole.ADMIN,
    },
  })
  const opPasswordHash = await bcrypt.hash('operadora123', 10)
  await prisma.adminUser.create({
    data: {
      email: 'operadora@sirburger.com',
      passwordHash: opPasswordHash,
      role: AdminRole.OPERADORA,
    },
  })

  console.log('👤 Usuarios administrativos creados (admin@sirburger.com / admin123)')

  // 6. Repartidores
  await prisma.courier.create({
    data: {
      name: 'Juan Repartidor',
      cardCode: 'REP-001',
      active: true,
    },
  })
  await prisma.courier.create({
    data: {
      name: 'Pedro Delivery',
      cardCode: 'REP-002',
      active: true,
    },
  })

  console.log('🛵 Repartidores registrados (REP-001, REP-002)')
  console.log('✅ Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('Error al ejecutar seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
