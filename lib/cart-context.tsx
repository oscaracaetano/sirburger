'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface CartModifier {
  optionId: string
  name: string
  priceDelta: number
  qty: number
}

export interface CartItem {
  id: string // unique cart item instance id
  productId: string
  productName: string
  basePrice: number
  unitPrice: number
  quantity: number
  modifiers: CartModifier[]
  notes?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, delta: number) => void
  clearCart: () => void
  totalCount: number
  subtotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'sirburger_cart_v1'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
      if (saved) {
        setItems(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Error loading cart from storage', e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save cart to localStorage on changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
      } catch (e) {
        console.error('Error saving cart to storage', e)
      }
    }
  }, [items, isLoaded])

  const addItem = (newItem: Omit<CartItem, 'id'>) => {
    const itemWithId: CartItem = {
      ...newItem,
      id: `${newItem.productId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    }
    setItems((prev) => [...prev, itemWithId])
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta
            return newQty > 0 ? { ...item, quantity: newQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
