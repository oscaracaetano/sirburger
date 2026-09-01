import { CartProvider } from '@/lib/cart-context'
import { Navbar } from '@/components/cliente/navbar'

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 selection:bg-amber-500 selection:text-white">
        <Navbar />
        <main className="flex-1 pb-16">{children}</main>
        <footer className="bg-gray-900 text-gray-400 py-8 border-t border-gray-800">
          <div className="max-w-5xl mx-auto px-4 text-center space-y-2">
            <p className="font-bold text-gray-200">🍔 SirBurger Delivery</p>
            <p className="text-xs text-gray-500">
              Pedidos de comida rápida elaborada con ingredientes premium.
            </p>
            <div className="pt-2 text-xs text-gray-600">
              <a href="/admin/pedidos" className="hover:text-amber-400 transition">
                Acceso Operadora / Admin
              </a>
            </div>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
