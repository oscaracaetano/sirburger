import { db } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function EstadisticasPage() {
  const [totalOrders, completedOrders, products] = await Promise.all([
    db.order.count(),
    db.order.findMany({
      where: { status: 'ENTREGADO' },
      include: {
        items: { include: { product: true } },
        statusLogs: true,
      },
    }),
    db.product.findMany({
      include: {
        orderItems: true,
        category: true,
      },
    }),
  ])

  // Total sales from completed
  const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total), 0)
  const avgTicket = completedOrders.length > 0 ? totalSales / completedOrders.length : 0

  // Top products by volume
  const topProducts = products
    .map((p) => {
      const soldCount = p.orderItems.reduce((sum, item) => sum + item.quantity, 0)
      const revenue = soldCount * Number(p.basePrice)
      return {
        id: p.id,
        name: p.name,
        category: p.category.name,
        soldCount,
        revenue,
      }
    })
    .sort((a, b) => b.soldCount - a.soldCount)

  // Status breakdown
  const ordersByStatus = await db.order.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Estadísticas y Reportes Operativos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Métricas históricas de ventas, cocina y rendimiento del local.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Total Pedidos Históricos
          </p>
          <p className="text-3xl font-black text-gray-900 mt-1">{totalOrders}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Ventas Totales Entregadas
          </p>
          <p className="text-3xl font-black text-amber-700 mt-1">
            {formatCurrency(totalSales)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Ticket Promedio
          </p>
          <p className="text-3xl font-black text-green-700 mt-1">
            {formatCurrency(avgTicket)}
          </p>
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200">
        <h2 className="text-lg font-black text-gray-900 mb-4">
          🏆 Ranking de Productos Más Vendidos
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-400 uppercase">
                <th className="py-2.5">Producto</th>
                <th className="py-2.5">Categoría</th>
                <th className="py-2.5 text-center">Unidades Vendidas</th>
                <th className="py-2.5 text-right">Facturación Estimada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topProducts.map((p, idx) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="py-3 font-bold text-gray-900">
                    <span className="text-gray-400 font-mono mr-2">#{idx + 1}</span>
                    {p.name}
                  </td>
                  <td className="py-3 text-gray-500">{p.category}</td>
                  <td className="py-3 text-center font-bold text-gray-800">
                    {p.soldCount}
                  </td>
                  <td className="py-3 text-right font-extrabold text-amber-700">
                    {formatCurrency(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders By Status Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200">
        <h2 className="text-lg font-black text-gray-900 mb-4">
          📊 Distribución por Estados
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ordersByStatus.map((st) => (
            <div
              key={st.status}
              className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-center"
            >
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                {st.status}
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {st._count.id}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
