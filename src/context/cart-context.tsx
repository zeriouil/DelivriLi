'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem, SelectedModifier } from '@/types';

interface CartContextType {
  items: CartItem[];
  addItem: (menuItem: MenuItem, quantity: number, selectedModifiers: SelectedModifier[], instructions?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  totalItemCount: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('quickmenu_cart');
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  // Sync with local storage
  useEffect(() => {
    localStorage.setItem('quickmenu_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (
    menuItem: MenuItem,
    quantity: number,
    selectedModifiers: SelectedModifier[],
    instructions?: string
  ) => {
    const modsPrice = selectedModifiers.reduce((acc, m) => acc + Number(m.priceDelta), 0);
    const unitPrice = Number(menuItem.base_price) + modsPrice;
    
    // Generate deterministic ID based on item & selected modifiers
    const modHash = selectedModifiers
      .map(m => m.modifierId)
      .sort()
      .join('-');
    const cartItemId = `${menuItem.id}_${modHash}_${instructions || ''}`;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          totalPrice: newQty * unitPrice,
        };
        return updated;
      }

      return [
        ...prev,
        {
          cartItemId,
          menuItem,
          quantity,
          selectedModifiers,
          unitPrice,
          totalPrice: quantity * unitPrice,
          instructions,
        },
      ];
    });

    setIsCartOpen(true);
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => setItems([]);

  const totalItemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + i.totalPrice, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItemCount,
        subtotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
