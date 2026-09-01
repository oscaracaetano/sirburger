'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart-context'

export function Navbar() {
  const { totalCount, subtotal } = useCart()

  return (
    <header className="sticky top-0 z-40 bg-amber-600 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-3xl group-hover:scale-110 transition transform">🍔</span>
          <div>
            <span className="text-2xl font-black tracking-tight">SirBurger</span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-amber-200">
              Delivery Gourmet
            </span>
          </div>
        </Link>

        <Link
          href="/carrito"
          className="relative flex items-center gap-2 bg-amber-700 hover:bg-amber-800 px-4 py-2 rounded-full font-medium transition shadow-sm"
        >
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
              />
            </svg>
            {totalCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-amber-600 animate-pulse">
                {totalCount}
              </span>
            )}
          </div>
          {totalCount > 0 && (
            <span className="hidden sm:inline text-sm font-semibold">
              ${subtotal.toLocaleString('es-AR')}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
