import { db } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CajaPage() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  // Fetch all orders from today that are not CANCELLED
  const ordersToday = await db.order.findMany({
    where: {
      createdAt: { gte: startOfDay },
      status: { not: 'CANCELADO' },
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              recipeItems: {
                include: { ingredient: true },
              },
            },
          },
        },
      },
      dispatch: {
        include: { courier: true },
      },
    },
  })

  // 1. Total Metrics
  const totalOrdersCount = ordersToday.length
  const totalRevenue = ordersToday.reduce((sum, o) => sum + Number(o.total), 0)

  // 2. Payment Method Breakdown
  const paymentBreakdown = {
    EFECTIVO: 0,
    POS: 0,
    TRANSFERENCIA: 0,
  }

  ordersToday.forEach((o) => {
    if (o.paymentMethod in paymentBreakdown) {
      paymentBreakdown[o.paymentMethod as keyof typeof paymentBreakdown] += Number(o.total)
    }
  })

  // 3. Courier Breakdown
  const courierMap = new Map<string, { name: string; ordersCount: number; revenue: number }>()

  ordersToday.forEach((o) => {
    const courierName = o.dispatch?.courier?.name || 'Sin Asignar / En Local'
    const existing = courierMap.get(courierName) || {
      name: courierName,
      ordersCount: 0,
      revenue: 0,
    }
    existing.ordersCount += 1
    existing.revenue += Number(o.total)
    courierMap.set(courierName, existing)
  })

  const courierStats = Array.from(courierMap.values())

  // 4. Theoretical Ingredient Consumption (§22 & §23)
  const ingredientUsageMap = new Map<
    string,
    { name: string; unit: string; totalConsumed: number }
  >()

  ordersToday.forEach((order) => {
    order.items.forEach((item) => {
      // Base recipe consumption
      item.product.recipeItems.forEach((ri) => {
        const ing = ri.ingredient
        const current = ingredientUsageMap.get(ing.id) || {
          name: ing.name,
          unit: ing.unit,
          totalConsumed: 0,
        }
        current.totalConsumed += Number(ri.quantity) * item.quantity
        ingredientUsageMap.set(ing.id, current)
      })
    })
  })

  const ingredientUsage = Array.from(ingredientUsageMap.values())

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Cierre Diario de Caja y Consumos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Jornada del {formatDate(new Date())} · Los cálculos se generan automáticamente en base a las ventas.
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Total de Pedidos
          </p>
          <p className="text-3xl font-black text-gray-900 mt-1">{totalOrdersCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Ventas Totales
          </p>
          <p className="text-3xl font-black text-amber-700 mt-1">
            {formatCurrency(totalRevenue)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Efectivo a Rendir
          </p>
          <p className="text-3xl font-black text-green-700 mt-1">
            {formatCurrency(paymentBreakdown.EFECTIVO)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            POS + Transferencias
          </p>
          <p className="text-3xl font-black text-indigo-700 mt-1">
            {formatCurrency(paymentBreakdown.POS + paymentBreakdown.TRANSFERENCIA)}
          </p>
        </div>
      </div>

      {/* Payment Method Details Table */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200">
        <h2 className="text-lg font-black text-gray-900 mb-4">
          💳 Desglose por Medio de Pago
        </h2>
        <div className="divide-y divide-gray-100 text-sm">
          <div className="py-3 flex justify-between items-center font-medium">
            <span className="flex items-center gap-2">
              <span>💵</span> Efectivo
            </span>
            <span className="font-bold text-gray-900">
              {formatCurrency(paymentBreakdown.EFECTIVO)}
            </span>
          </div>
          <div className="py-3 flex justify-between items-center font-medium">
            <span className="flex items-center gap-2">
              <span>💳</span> POS / Tarjetas
            </span>
            <span className="font-bold text-gray-900">
              {formatCurrency(paymentBreakdown.POS)}
            </span>
          </div>
          <div className="py-3 flex justify-between items-center font-medium">
            <span className="flex items-center gap-2">
              <span>📱</span> Transferencias Bancarias / QR
            </span>
            <span className="font-bold text-gray-900">
              {formatCurrency(paymentBreakdown.TRANSFERENCIA)}
            </span>
          </div>
        </div>
      </div>

      {/* Courier Breakdown Table */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200">
        <h2 className="text-lg font-black text-gray-900 mb-4">
          🛵 Rendición por Repartidor
        </h2>
        {courierStats.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No hay entregas registradas hoy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-400 uppercase">
                  <th className="py-2.5">Repartidor</th>
                  <th className="py-2.5 text-center">Pedidos</th>
                  <th className="py-2.5 text-right">Importe Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courierStats.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3 font-bold text-gray-900">{c.name}</td>
                    <td className="py-3 text-center text-gray-600 font-semibold">
                      {c.ordersCount}
                    </td>
                    <td className="py-3 text-right font-extrabold text-amber-700">
                      {formatCurrency(c.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Theoretical Ingredient Consumption */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              🥩 Consumo Teórico de Ingredientes (§23)
            </h2>
            <p className="text-xs text-gray-500">
              Calculado automáticamente a partir de las recetas y modificaciones de los pedidos vendidos.
            </p>
          </div>
        </div>

        {ingredientUsage.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin consumos hoy.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ingredientUsage.map((ing, i) => (
              <div
                key={i}
                className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-sm"
              >
                <span className="font-semibold text-gray-700">{ing.name}</span>
                <span className="font-extrabold text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                  {ing.totalConsumed.toLocaleString('es-AR')} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
