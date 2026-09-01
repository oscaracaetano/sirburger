# Plan de desarrollo — Sistema de pedidos, cocina, delivery y gestión

**Stack objetivo:** Next.js (App Router) en Vercel + PostgreSQL en Neon + Prisma ORM
**Audiencia:** equipo de programación, punto de partida para escribir código
**Estado:** v1 — listo para iniciar Sprint 0

---

## 1. Resumen de arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL (Next.js)                        │
│                                                                   │
│  /app                                                            │
│   ├── (cliente)      → sitio público: menú, carrito, checkout    │
│   ├── (admin)        → panel: cola de pedidos, cocina, despacho, │
│   │                     caja, estadísticas, configuración        │
│   └── api/           → Route Handlers (REST) consumidos por      │
│                         ambos frontends                          │
│                                                                   │
│  Server Actions / Route Handlers ──► Prisma Client ──► Neon PG   │
│  Realtime (pedidos entrando a cocina) ──► Pusher / Ably / SSE    │
└─────────────────────────────────────────────────────────────────┘
        │                                   │
        │ webhook / polling                 │ conexión directa
        ▼                                   ▼
┌────────────────────┐            ┌─────────────────────────┐
│  Agente de impresión │            │   Neon PostgreSQL       │
│  (servicio local en  │            │   (branch dev / prod)   │
│  el local, ver §6.1) │            └─────────────────────────┘
└────────────────────┘
```

**Por qué esta arquitectura:**
- Next.js full-stack en Vercel evita mantener un backend separado; App Router permite Server Components para el panel admin (datos siempre frescos) y Server Actions para mutaciones sin escribir API a mano.
- Neon es Postgres serverless, compatible con Prisma, con *branching* de base de datos: cada Pull Request puede tener su propia copia de la base de datos para probar sin tocar producción.
- El punto crítico de esta arquitectura es que **Vercel es serverless y no puede hablar directamente con una impresora térmica USB/red dentro del local**. Esto se resuelve con un pequeño agente local (§6.1) — hay que decidirlo desde el día 1 porque condiciona el diseño de la tabla `orders` y de los webhooks.

---

## 2. Estructura de repositorio propuesta

```
sistema-pedidos/
├── apps/
│   └── web/                      # Next.js app (única app desplegada en Vercel)
│       ├── app/
│       │   ├── (cliente)/
│       │   │   ├── page.tsx              # home / menú
│       │   │   ├── producto/[id]/page.tsx
│       │   │   ├── carrito/page.tsx
│       │   │   └── checkout/page.tsx
│       │   ├── (admin)/
│       │   │   ├── login/
│       │   │   ├── pedidos/page.tsx      # cola FIFO
│       │   │   ├── pedidos/[id]/page.tsx # detalle + intervención
│       │   │   ├── cocina/page.tsx       # vista de cocina (opcional, o solo ticket)
│       │   │   ├── despacho/page.tsx     # escaneo de repartidores
│       │   │   ├── caja/page.tsx         # cierre diario
│       │   │   ├── estadisticas/page.tsx
│       │   │   └── configuracion/
│       │   │       ├── productos/
│       │   │       ├── horarios/
│       │   │       ├── promociones/
│       │   │       └── ingredientes/
│       │   └── api/
│       │       ├── orders/
│       │       ├── kitchen/print/
│       │       ├── dispatch/
│       │       ├── webhooks/
│       │       └── realtime/
│       ├── lib/
│       │   ├── db.ts              # Prisma client singleton
│       │   ├── auth.ts
│       │   ├── pricing.ts         # motor de precios/promos
│       │   ├── order-state.ts     # máquina de estados del pedido
│       │   └── realtime.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── components/
│       └── tests/
├── packages/
│   └── print-agent/               # servicio Node liviano corriendo en el local
├── .github/workflows/             # CI (lint, test, prisma validate)
├── .env.example
└── README.md
```

Usamos **un solo proyecto Next.js** (no dos apps separadas para cliente y admin) porque comparten modelo de datos, lógica de precios y despliegue; se separan por *route groups* `(cliente)` y `(admin)` y por middleware de autenticación.

---

## 3. Modelo de datos (Prisma / Neon)

Este es el corazón del sistema. Se entrega ya modelado para que el equipo pueda correr `prisma migrate dev` el primer día. Los tipos están simplificados pero cubren todos los puntos del documento de requerimientos.

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ---------- Catálogo ----------

model Category {
  id        String    @id @default(cuid())
  name      String
  order     Int       @default(0)
  products  Product[]
}

model Product {
  id            String            @id @default(cuid())
  name          String
  description   String?
  photoUrl      String?
  basePrice     Decimal           @db.Decimal(10, 2)
  categoryId    String
  category      Category          @relation(fields: [categoryId], references: [id])
  isSoldOut     Boolean           @default(false)
  prepTimeMin   Int               // minutos estimados de preparación
  modifierGroups ModifierGroup[]
  recipeItems   RecipeItem[]
  orderItems    OrderItem[]
  active        Boolean           @default(true)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

// Grupo de modificadores: "Quitar ingredientes", "Extras", "Cantidad de papas"
model ModifierGroup {
  id          String     @id @default(cuid())
  productId   String
  product     Product    @relation(fields: [productId], references: [id])
  name        String     // ej: "Extras"
  type        ModifierType
  minSelect   Int        @default(0)
  maxSelect   Int?       // null = sin límite
  options     ModifierOption[]
}

enum ModifierType {
  SINGLE_CHOICE   // radio (ej: tipo de pan)
  MULTI_CHOICE    // checkbox (ej: sin lechuga, sin tomate)
  QUANTITY        // +/- (ej: extra cheddar, doble carne)
}

model ModifierOption {
  id             String        @id @default(cuid())
  groupId        String
  group          ModifierGroup @relation(fields: [groupId], references: [id])
  name           String        // ej: "Extra cheddar"
  priceDelta     Decimal       @db.Decimal(10, 2) @default(0)
  ingredientId   String?       // para descontar del inventario teórico
  ingredient     Ingredient?   @relation(fields: [ingredientId], references: [id])
  qtyDelta       Decimal?      @db.Decimal(10, 3) // cuánto ingrediente suma/resta esta opción
  isSoldOut      Boolean       @default(false)
  maxQty         Int?          // tope para tipo QUANTITY (ej: triple carne = 3)
}

// ---------- Recetas / inventario teórico ----------

model Ingredient {
  id            String            @id @default(cuid())
  name          String
  unit          String            // "g", "kg", "unidad", "ml"
  isSoldOut     Boolean           @default(false)
  recipeItems   RecipeItem[]
  modifierUses  ModifierOption[]
}

model RecipeItem {
  id            String      @id @default(cuid())
  productId     String
  product       Product     @relation(fields: [productId], references: [id])
  ingredientId  String
  ingredient    Ingredient  @relation(fields: [ingredientId], references: [id])
  quantity      Decimal     @db.Decimal(10, 3) // cantidad base por unidad de producto
}

// ---------- Clientes ----------

model Customer {
  id            String     @id @default(cuid())
  phone         String     @unique
  name          String?
  address       String?
  addressRef    String?    // referencia para llegar
  lat           Float?
  lng           Float?
  orders        Order[]
  createdAt     DateTime   @default(now())
}

// ---------- Promociones ----------

model Promotion {
  id           String     @id @default(cuid())
  name         String
  description  String?
  productIds   String[]   // productos incluidos
  price        Decimal?   @db.Decimal(10, 2)
  daysOfWeek   Int[]      // 0-6
  startTime    String?    // "19:00"
  endTime      String?    // "23:00"
  startDate    DateTime?
  endDate      DateTime?
  active       Boolean    @default(true)
}

// ---------- Horarios de atención ----------

model BusinessHours {
  id          String   @id @default(cuid())
  dayOfWeek   Int      // 0=domingo ... 6=sábado
  openTime    String   // "19:00"
  closeTime   String   // "00:00" / "01:00" (cruza medianoche → resolver en lógica)
  isClosed    Boolean  @default(false)
}

// ---------- Pedidos ----------

model Order {
  id             String        @id @default(cuid())
  code           String        @unique   // "A4837"
  customerId     String
  customer       Customer      @relation(fields: [customerId], references: [id])
  status         OrderStatus   @default(RECIBIDO)
  paymentMethod  String        // "efectivo" | "pos" | "transferencia" | extensible
  total          Decimal       @db.Decimal(10, 2)
  discount       Decimal?      @db.Decimal(10, 2)
  items          OrderItem[]
  statusLogs     OrderStatusLog[]
  interventions  Intervention[]
  courierId      String?
  courier        Courier?      @relation(fields: [courierId], references: [id])
  dispatchedAt   DateTime?
  deliveredAt    DateTime?
  barcodeValue   String        @unique  // valor codificado en el ticket
  createdAt      DateTime      @default(now())
}

enum OrderStatus {
  RECIBIDO
  APROBADO
  EN_PREPARACION
  LISTO
  EN_CALLE
  ENTREGADO
  INTERVENCION
  CANCELADO
}

model OrderItem {
  id            String     @id @default(cuid())
  orderId       String
  order         Order      @relation(fields: [orderId], references: [id])
  productId     String
  product       Product    @relation(fields: [productId], references: [id])
  quantity      Int
  unitPrice     Decimal    @db.Decimal(10, 2)
  modifiers     Json       // snapshot de modificadores elegidos [{name, priceDelta, qty}]
  notes         String?
}

// Historial de transición de estados (auditoría / línea de tiempo)
model OrderStatusLog {
  id          String       @id @default(cuid())
  orderId     String
  order       Order        @relation(fields: [orderId], references: [id])
  status      OrderStatus
  actor       String?      // usuario/operadora que hizo el cambio
  createdAt   DateTime     @default(now())
}

model Intervention {
  id            String    @id @default(cuid())
  orderId       String
  order         Order     @relation(fields: [orderId], references: [id])
  reason        String    // "Cheddar", "Papas fritas", "Otro"...
  message       String    // mensaje generado/editado para WhatsApp
  resolution    String?   // "modificado" | "mantenido" | "descuento" | "cupon" | "cancelado"
  createdAt     DateTime  @default(now())
}

// ---------- Repartidores ----------

model Courier {
  id           String    @id @default(cuid())
  name         String
  cardCode     String    @unique // código de barras de su tarjeta
  active       Boolean   @default(true)
  orders       Order[]
}

// ---------- Usuarios administrativos ----------

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         String   // "operadora" | "admin"
  createdAt    DateTime @default(now())
}
```

**Notas de diseño importantes:**
- `Order.barcodeValue` es lo que se imprime como código de barras en el ticket; se usa tanto para marcar "LISTO" (escaneo en cocina) como para el despacho a repartidores.
- `OrderItem.modifiers` se guarda como snapshot en `Json` (no como relación viva a `ModifierOption`) porque el ticket y el precio ya cobrado no deben cambiar si mañana se edita el catálogo.
- `OrderStatusLog` es la tabla que alimenta el timeline de §30 del documento de requerimientos y las estadísticas de tiempos de cocina (§26).
- El consumo teórico de ingredientes (§22-23) se calcula on-demand con una query que cruza `OrderItem.modifiers` + `RecipeItem`, no se pre-materializa (evita inconsistencias); si el volumen crece, se puede mover a un job agregador después.

---

## 4. Módulos funcionales y su prioridad de construcción

| # | Módulo | Depende de | Prioridad |
|---|--------|-----------|-----------|
| 1 | Catálogo + menú público (sin carrito) | Modelo de datos | Sprint 1 |
| 2 | Carrito, personalización, cálculo de precio en vivo | 1 | Sprint 1-2 |
| 3 | Horarios de atención (bloqueo de carrito fuera de horario) | Modelo de datos | Sprint 2 |
| 4 | Checkout + datos de cliente + autocompletado por teléfono | 2 | Sprint 2 |
| 5 | Confirmación de pedido + generación de código | 4 | Sprint 2 |
| 6 | Panel admin — cola FIFO de pedidos | 5 | Sprint 3 |
| 7 | Acciones: A COCINA / INTERVENIR / CANCELAR | 6 | Sprint 3 |
| 8 | Sistema de intervención (detección de problemas + mensaje WhatsApp) | 7 | Sprint 3-4 |
| 9 | Impresión de ticket de cocina (agente local) | 7 | Sprint 4 |
| 10 | Alertas de demora por color según tiempo | Modelo de datos | Sprint 4 |
| 11 | Escaneo "pedido LISTO" | 9 | Sprint 4 |
| 12 | Despacho a repartidores (escaneo de tarjeta + pedidos) | 11 | Sprint 5 |
| 13 | Notificación "EN CALLE" al cliente | 12 | Sprint 5 |
| 14 | Registro de entrega (ENTREGADO) | 12 | Sprint 5 |
| 15 | Caja y cierre diario | 5, 12 | Sprint 6 |
| 16 | Recetas e inventario teórico | Modelo de datos | Sprint 6 |
| 17 | Productos agotados (toggle rápido) | 1 | Sprint 6 (rápido, puede adelantarse) |
| 18 | Promociones | 2 | Sprint 6-7 |
| 19 | Estadísticas (ventas, cocina, geográficas) | Todo lo anterior | Sprint 7-8 |
| 20 | Registro de actividad / auditoría | Ya viene de OrderStatusLog | Transversal |

Recomendación: **construir el flujo feliz end-to-end primero** (cliente hace pedido → operadora lo manda a cocina → se marca listo → se despacha → se entrega) con datos mockeados si hace falta, antes de pulir intervención, promociones o estadísticas. Eso valida la arquitectura completa temprano.

---

## 5. Puntos técnicos que requieren decisión previa (bloqueantes)

### 5.1 Impresión térmica y escaneo de códigos de barras
Vercel no tiene acceso a hardware local. Dos piezas necesarias antes de codear el módulo de cocina:

- **Impresora térmica:** se necesita un pequeño agente (Node.js o similar) corriendo en una PC/Raspberry Pi del local, conectado a la impresora por USB/red, que:
  - Escucha un webhook o hace *polling* corto (cada 2-3s) a `GET /api/kitchen/pending-prints`.
  - Al recibir un pedido nuevo, formatea el ticket (texto + código de barras, típicamente vía comandos ESC/POS) y lo envía a la impresora.
  - Marca el pedido como impreso vía `POST /api/kitchen/print/:id/ack`.
  - Este agente vive en `packages/print-agent/` del mismo repo, pero se despliega/corre localmente, no en Vercel.
- **Escaneo de códigos de barras:** un lector USB estándar funciona como teclado (HID) — no requiere driver especial. Las pantallas de "Pedido listo" y "Despacho" solo necesitan un `<input>` enfocado que capture el texto y un `Enter` automático del lector. Confirmar con el cliente qué modelo de lector/impresora se va a usar antes de escribir el parser del ticket.

### 5.2 Tiempo real en la cola de pedidos y en despacho
La cola de pedidos y el semáforo de colores necesitan actualizarse sin que la operadora recargue la página.
- Opción recomendada: **Pusher** o **Ably** (ambos compatibles con Vercel serverless, sin necesidad de mantener un WebSocket propio).
- Alternativa más simple para v1: *polling* con SWR/React Query cada 5-10 segundos sobre `GET /api/orders?status=activos`. Es suficiente para un solo local y evita sumar un proveedor externo. **Se recomienda arrancar con polling y migrar a Pusher solo si se nota latencia real.**

### 5.3 Autenticación del panel admin
Usar **NextAuth.js (Auth.js)** con proveedor de credenciales (email/password contra `AdminUser`) o magic link. Roles mínimos: `operadora` (cola, cocina, despacho) y `admin` (todo + configuración + estadísticas).

### 5.4 Zona horaria y cruce de medianoche en horarios
Los horarios viernes/sábado cruzan la medianoche (19:00–01:00). La función que valida "¿está abierto?" debe manejar este caso explícitamente — es un bug clásico. Se resuelve en `lib/business-hours.ts` con una función pura y testeada unitariamente desde el Sprint 2.

### 5.5 Mapa de calor geográfico (§27)
Requiere geocodificar direcciones (texto → lat/lng). Usar un servicio de geocoding (Google Maps Geocoding API o Mapbox) al momento de crear el `Customer`/`Order`, guardando `lat`/`lng` ya en el modelo. El mapa de calor en sí puede renderizarse con **Mapbox GL** o **Leaflet + heatmap.js** en el módulo de estadísticas (Sprint 7-8, no bloqueante).

---

## 6. Setup inicial — instrucciones paso a paso para el equipo

### Paso 1 — Crear el proyecto en Neon
1. Crear cuenta/proyecto en https://console.neon.tech
2. Crear una base `sistema_pedidos` con branch `main` (producción) y branch `dev` (desarrollo).
3. Copiar el *connection string* (pooled, con `?sslmode=require`) de cada branch.
4. Activar **Neon branching por Pull Request** (integración con GitHub) para que cada PR tenga su base de datos aislada automáticamente — muy recomendable dado el volumen de cambios de esquema que va a tener este proyecto.

### Paso 2 — Crear el proyecto en Vercel
1. Importar el repo de GitHub en https://vercel.com/new
2. Framework preset: **Next.js** (autodetectado).
3. En **Environment Variables**, cargar (ver §7 para el detalle completo):
   - `DATABASE_URL` (branch `main` de Neon, para el ambiente Production)
   - `DATABASE_URL` distinto para Preview (branch `dev`, o el branch automático de Neon por PR si se activó la integración)
4. Activar **Vercel Preview Deployments** (viene por defecto): cada PR obtiene una URL única para revisión.

### Paso 3 — Bootstrap del proyecto Next.js
```bash
npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir=false --import-alias "@/*"
cd apps/web
npm install prisma @prisma/client
npm install next-auth
npm install swr
npx prisma init
```

### Paso 4 — Cargar el schema y migrar
1. Pegar el contenido de §3 en `apps/web/prisma/schema.prisma`.
2. Configurar `.env`:
   ```
   DATABASE_URL="postgresql://<user>:<pass>@<host>/sistema_pedidos?sslmode=require"
   ```
3. Correr:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```
4. Verificar en Neon Console que las tablas se crearon correctamente.
5. Crear un `prisma/seed.ts` con datos mínimos (2-3 categorías, 5 productos con modificadores, horarios de la semana) para no arrancar con la base vacía.

### Paso 5 — Cliente de Prisma singleton
Crear `lib/db.ts`:
```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['query', 'error', 'warn'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```
Esto evita el error clásico de "too many connections" en serverless/dev con hot-reload. En producción sobre Vercel, además conviene usar el *connection pooling* que Neon ofrece nativamente (parámetro `-pooler` en el connection string).

### Paso 6 — Primer end-to-end mínimo (objetivo de la primera semana)
Para validar que toda la cadena funciona, el primer hito concreto del equipo debería ser:
1. Página `/` que lista productos desde la base (Server Component + Prisma).
2. Un Server Action `createOrder()` que inserta un `Order` + `OrderItem` mínimos.
3. Página `/admin/pedidos` que lista pedidos con `status = RECIBIDO` ordenados por `createdAt` (FIFO).
4. Botón "A COCINA" que hace `updateOrderStatus(id, 'EN_PREPARACION')` y escribe un `OrderStatusLog`.

Esto no es una funcionalidad completa, es una prueba de que **cliente → base de datos → panel admin** funciona de punta a punta antes de invertir tiempo en pulir cada módulo.

### Paso 7 — CI mínimo
`.github/workflows/ci.yml`:
```yaml
name: CI
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
        working-directory: apps/web
      - run: npx prisma validate
        working-directory: apps/web
      - run: npm run lint
        working-directory: apps/web
      - run: npm run build
        working-directory: apps/web
```

---

## 7. Variables de entorno (`.env.example`)

```bash
# Base de datos
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Geocoding (para direcciones y mapa de calor, §5.5)
GEOCODING_API_KEY=

# Realtime (si se usa Pusher/Ably, ver §5.2)
REALTIME_APP_ID=
REALTIME_KEY=
REALTIME_SECRET=
REALTIME_CLUSTER=

# Agente de impresión
PRINT_AGENT_TOKEN=          # token compartido para autenticar el polling del agente local

# WhatsApp (solo se abre wa.me, no requiere API, pero se deja documentado)
WHATSAPP_DEFAULT_COUNTRY_CODE=598
```

---

## 8. Convenciones de trabajo

- **Lenguaje:** TypeScript estricto en todo el repo (`strict: true` en `tsconfig.json`).
- **Ramas:** `main` (producción, protegida), `dev` (integración), ramas de feature `feat/<modulo>-<breve-descripcion>` desde `dev`.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`) para poder generar changelog automático más adelante.
- **Revisión de PR:** obligatoria antes de mergear a `dev`; cada PR debe abrir su Preview Deployment de Vercel y su branch de Neon antes de aprobarse.
- **Máquina de estados del pedido:** todas las transiciones de `OrderStatus` deben pasar por una única función en `lib/order-state.ts` que valide transiciones permitidas (por ejemplo, no se puede pasar de `RECIBIDO` a `ENTREGADO` directo) y escriba el `OrderStatusLog`. Ningún código debe hacer `db.order.update({ status: ... })` directamente fuera de esa función.
- **Dinero:** siempre `Decimal` de Prisma (nunca `number`/`float`) para evitar errores de redondeo en precios.
- **Tests mínimos por sprint:** lógica de precios (`pricing.ts`), horarios (`business-hours.ts`) y la máquina de estados (`order-state.ts`) deben tener tests unitarios desde que se escriben, no al final.

---

## 9. Próximos pasos inmediatos para el equipo

1. Crear el proyecto en Neon y en Vercel (Paso 1 y 2 de §6).
2. Hacer el bootstrap de Next.js y correr la primera migración con el schema de §3.
3. Construir el end-to-end mínimo descrito en el Paso 6 de §6 — es el hito que desbloquea todo lo demás.
4. Definir con el cliente el modelo/marca de impresora térmica y lector de código de barras antes de iniciar el Sprint 4 (§5.1), porque condiciona el diseño del agente de impresión.
5. Confirmar proveedor de geocoding y de realtime (§5.2, §5.5) antes del Sprint 5-7 para no bloquear esas fases.

