import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">🍔 SirBurger</h1>
          <p className="text-gray-400 text-sm">Panel de administración</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin/pedidos" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition">
            <span>📋</span> Pedidos
          </Link>
          <Link href="/admin/despacho" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition">
            <span>🛵</span> Despacho
          </Link>
          <Link href="/admin/reparto" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition">
            <span>📦</span> Reparto en Calle
          </Link>
          <Link href="/admin/caja" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition">
            <span>💰</span> Caja
          </Link>
          <Link href="/admin/estadisticas" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition">
            <span>📊</span> Estadísticas
          </Link>
          <div className="border-t border-gray-700 my-4"></div>
          <Link href="/admin/configuracion/productos" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition">
            <span>🛠️</span> Configuración
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition">
            ← Ver sitio público
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
