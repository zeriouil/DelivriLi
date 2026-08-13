'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, ShoppingBag, MapPin, Star, Clock, Flame, Heart,
  ChevronDown, X, Zap, Tag, TrendingUp
} from 'lucide-react';
import { MenuItem, Category, Restaurant } from '@/types';
import { useCart } from '@/context/cart-context';
import { ItemModal } from '@/components/customer/item-modal';
import { CartDrawer } from '@/components/cart/cart-drawer';

/* ────── Demo Data ────────────────────────────────────── */
const DEMO_RESTAURANT: Restaurant = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'taco-barn',
  name: 'Taco Barn Casa',
  phone_number: '212612345678',
  currency_code: 'MAD',
  currency_symbol: 'DH',
  address: 'Boulevard Anfa, Casablanca',
  delivery_fee: 15.00,
  min_order_amount: 50.00,
  is_active: true,
};

const DEMO_CATEGORIES: Category[] = [
  { id: 'c1', restaurant_id: 'r1', name: '🔥 Popular',  display_order: 1, is_active: true },
  { id: 'c2', restaurant_id: 'r1', name: '🌮 Tacos',    display_order: 2, is_active: true },
  { id: 'c3', restaurant_id: 'r1', name: '🍔 Burgers',  display_order: 3, is_active: true },
  { id: 'c4', restaurant_id: 'r1', name: '🥤 Drinks',   display_order: 4, is_active: true },
  { id: 'c5', restaurant_id: 'r1', name: '🍟 Sides',    display_order: 5, is_active: true },
];

const DEMO_ITEMS: MenuItem[] = [
  {
    id: 'm1', restaurant_id: 'r1', category_id: 'c2',
    name: 'French Taco XL',
    description: 'Choice of 3 meats, stuffed with crispy fries & signature warm cheese sauce. A Casablanca classic!',
    base_price: 55.00, badge: 'Best Seller', is_available: true,
    modifier_groups: [
      {
        id: 'mg1', restaurant_id: 'r1', name: 'Select 3 Meats',
        min_selection: 1, max_selection: 3, is_required: true,
        modifiers: [
          { id: 'mod1', group_id: 'mg1', name: 'Minced Beef',           price_delta: 0,    is_available: true, display_order: 1 },
          { id: 'mod2', group_id: 'mg1', name: 'Crispy Chicken Tenders',price_delta: 0,    is_available: true, display_order: 2 },
          { id: 'mod3', group_id: 'mg1', name: 'Marinated Meatballs',   price_delta: 5.00, is_available: true, display_order: 3 },
        ],
      },
      {
        id: 'mg2', restaurant_id: 'r1', name: 'Choose Sauces',
        min_selection: 0, max_selection: 2, is_required: false,
        modifiers: [
          { id: 'mod4', group_id: 'mg2', name: 'Algérienne',        price_delta: 0,    is_available: true, display_order: 1 },
          { id: 'mod5', group_id: 'mg2', name: 'Biggy Burger',      price_delta: 0,    is_available: true, display_order: 2 },
          { id: 'mod6', group_id: 'mg2', name: 'Extra Cheese Sauce',price_delta: 4.00, is_available: true, display_order: 3 },
        ],
      },
    ],
  },
  {
    id: 'm2', restaurant_id: 'r1', category_id: 'c3',
    name: 'Smash Truffle Burger',
    description: 'Double Angus beef patties, caramelized onions, melted cheddar & truffle mayo. Premium comfort food.',
    base_price: 65.00, badge: 'Chef Favorite', is_available: true,
  },
  {
    id: 'm3', restaurant_id: 'r1', category_id: 'c1',
    name: 'Loaded Nachos',
    description: 'Crispy tortilla chips piled high with melted cheddar, jalapeños, sour cream & fresh guacamole.',
    base_price: 45.00, badge: 'New', is_available: true,
  },
  {
    id: 'm4', restaurant_id: 'r1', category_id: 'c4',
    name: 'Fresh Lemonade',
    description: 'Hand-squeezed Moroccan lemons with a hint of mint and rose water. Served ice cold.',
    base_price: 22.00, is_available: true,
  },
  {
    id: 'm5', restaurant_id: 'r1', category_id: 'c5',
    name: 'Truffle Fries',
    description: 'Golden Belgian fries tossed in truffle oil, parmesan, and fresh herbs.',
    base_price: 32.00, badge: 'Popular', is_available: true,
  },
  {
    id: 'm6', restaurant_id: 'r1', category_id: 'c3',
    name: 'Crispy Chicken Burger',
    description: 'Double-fried buttermilk chicken, pickles, sriracha mayo on a brioche bun.',
    base_price: 58.00, is_available: false,
  },
];

const ITEM_ICONS: Record<string, string> = {
  m1: '🌮', m2: '🍔', m3: '🧀', m4: '🍋', m5: '🍟', m6: '🍗',
};
const ITEM_CALORIES: Record<string, string> = {
  m1: '820 kcal', m2: '950 kcal', m3: '680 kcal', m4: '120 kcal', m5: '460 kcal', m6: '870 kcal',
};

const BADGE_STYLE: Record<string, string> = {
  'Best Seller': 'bg-amber-400/20 text-amber-700 border border-amber-300',
  'Chef Favorite': 'bg-rose-400/20 text-rose-700 border border-rose-300',
  'New': 'bg-sky-400/20 text-sky-700 border border-sky-300',
  'Popular': 'bg-violet-400/20 text-violet-700 border border-violet-300',
};

type SortOption = 'default' | 'price_asc' | 'price_desc';

const PROMOS = [
  '🎉 Free delivery on orders above 100 DH',
  '⚡ Order in 30 seconds — Track in real time',
  '🌶️ New spicy menu items just dropped!',
];

/* ────── Component ────────────────────────────────────── */
export default function CustomerMenuPage() {
  const { totalItemCount, subtotal, isCartOpen, setIsCartOpen } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalItem, setActiveModalItem] = useState<MenuItem | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showSort, setShowSort] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [promoIdx, setPromoIdx] = useState(0);
  const [cartBump, setCartBump] = useState(false);
  const prevCount = useRef(totalItemCount);

  // Load favourites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('menu_favourites');
      if (saved) setFavourites(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  // Rotate promo banner
  useEffect(() => {
    const t = setInterval(() => setPromoIdx(i => (i + 1) % PROMOS.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Bump animation on cart change
  useEffect(() => {
    if (totalItemCount > prevCount.current) {
      setCartBump(true);
      setTimeout(() => setCartBump(false), 400);
    }
    prevCount.current = totalItemCount;
  }, [totalItemCount]);

  const toggleFavourite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavourites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('menu_favourites', JSON.stringify([...next]));
      return next;
    });
  };

  // Filter + Sort
  let filteredItems = DEMO_ITEMS.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(q) ||
                          item.description?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  if (sortBy === 'price_asc') filteredItems = [...filteredItems].sort((a, b) => a.base_price - b.base_price);
  if (sortBy === 'price_desc') filteredItems = [...filteredItems].sort((a, b) => b.base_price - a.base_price);

  const itemCountByCat = (catId: string) =>
    DEMO_ITEMS.filter(i => i.category_id === catId).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 font-[Outfit]">

      {/* ── Hero Header ─────────────────────────────── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 text-white pt-10 pb-8 px-4 rounded-b-[2rem] shadow-xl">
        {/* Animated blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob absolute -top-10 -right-10 w-52 h-52 rounded-full bg-teal-400/30 blur-3xl" />
          <div className="animate-blob absolute bottom-0 -left-12 w-44 h-44 rounded-full bg-emerald-900/40 blur-2xl" style={{ animationDelay: '-3s' }} />
        </div>

        <div className="relative z-10 max-w-md mx-auto">
          {/* Logo + Info */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
              🌮
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black tracking-tight truncate">{DEMO_RESTAURANT.name}</h1>
              <p className="text-emerald-100 text-xs flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{DEMO_RESTAURANT.address}</span>
              </p>
              {/* Rating + delivery meta */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5 font-semibold">
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> 4.8
                </span>
                <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5 font-semibold">
                  <Clock className="w-3 h-3" /> 20-35 min
                </span>
                <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5 font-semibold">
                  <Zap className="w-3 h-3 text-amber-300" /> {DEMO_RESTAURANT.delivery_fee} DH delivery
                </span>
                <span className="text-xs bg-emerald-400/30 text-emerald-50 rounded-full px-2 py-0.5 font-bold border border-emerald-300/50">
                  ● Open Now
                </span>
              </div>
            </div>
          </div>

          {/* Promo Banner */}
          <div className="mb-4 bg-white/15 border border-white/20 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs font-semibold backdrop-blur-sm overflow-hidden">
            <Tag className="w-3.5 h-3.5 flex-shrink-0 text-amber-300" />
            <span className="animate-fade-in" key={promoIdx}>{PROMOS[promoIdx]}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="menu-search"
              type="text"
              placeholder="Search tacos, burgers, drinks…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white text-slate-900 placeholder-slate-400 pl-10 pr-10 py-3 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-300 focus:outline-none shadow-md"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Sticky Categories + Sort ─────────────────── */}
      <div className="sticky top-0 z-30 glass border-b border-slate-200/60 py-3 px-4">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
            <button
              id="cat-all"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
              }`}
            >
              All
            </button>
            {DEMO_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                id={`cat-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
                }`}
              >
                {cat.name}
                <span className={`text-[10px] rounded-full px-1.5 py-0 font-bold ${selectedCategory === cat.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {itemCountByCat(cat.id)}
                </span>
              </button>
            ))}
          </div>

          {/* Sort button */}
          <div className="relative flex-shrink-0">
            <button
              id="sort-btn"
              onClick={() => setShowSort(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 hover:border-slate-300 text-slate-600 transition"
            >
              <TrendingUp className="w-3 h-3" />
              Sort
              <ChevronDown className={`w-3 h-3 transition-transform ${showSort ? 'rotate-180' : ''}`} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 w-44 animate-scale-in">
                {([
                  ['default',    'Default'],
                  ['price_asc',  'Price: Low → High'],
                  ['price_desc', 'Price: High → Low'],
                ] as [SortOption, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setSortBy(val); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition hover:bg-emerald-50 ${sortBy === val ? 'text-emerald-600 bg-emerald-50' : 'text-slate-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Menu Grid ───────────────────────────────── */}
      <main className="max-w-md mx-auto px-4 mt-5 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="font-bold text-slate-700 text-lg">No items found</h3>
            <p className="text-slate-400 text-sm mt-1">Try a different search or category</p>
            <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} className="mt-5 px-5 py-2.5 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition">
              Clear Filters
            </button>
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <div
              key={item.id}
              id={`item-${item.id}`}
              onClick={() => item.is_available && setActiveModalItem(item)}
              className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden card-lift animate-slide-up ${!item.is_available ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              <div className="flex gap-0">
                {/* Text side */}
                <div className="flex-1 p-4 space-y-1.5 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    {item.badge && (
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${BADGE_STYLE[item.badge] || 'bg-slate-100 text-slate-600'}`}>
                        {item.badge}
                      </span>
                    )}
                    {!item.is_available && (
                      <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">
                        Sold Out
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{item.name}</h3>
                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{item.description}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-emerald-600 font-extrabold text-sm">
                      {Number(item.base_price).toFixed(2)} {DEMO_RESTAURANT.currency_symbol}
                    </span>
                    {ITEM_CALORIES[item.id] && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <Flame className="w-2.5 h-2.5 text-orange-400" />
                        {ITEM_CALORIES[item.id]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Image / Icon side */}
                <div className="w-28 h-28 relative flex-shrink-0 self-center mr-3">
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center text-4xl shadow-inner overflow-hidden">
                    {ITEM_ICONS[item.id] || '🍽️'}
                  </div>
                  {/* Favourite button */}
                  <button
                    id={`fav-${item.id}`}
                    onClick={e => toggleFavourite(e, item.id)}
                    className={`absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center shadow transition-all ${
                      favourites.has(item.id)
                        ? 'bg-rose-500 text-white scale-110'
                        : 'bg-white/80 backdrop-blur text-slate-400 hover:text-rose-400'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${favourites.has(item.id) ? 'fill-white' : ''}`} />
                  </button>
                  {/* Add button */}
                  {item.is_available && (
                    <div className="absolute bottom-1 right-1 bg-emerald-600 text-white p-1.5 rounded-full shadow-md shadow-emerald-600/40">
                      <ShoppingBag className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* ── Sticky Cart FAB ─────────────────────────── */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4 animate-slide-up">
          <div className="max-w-md mx-auto">
            <button
              id="view-cart-btn"
              onClick={() => setIsCartOpen(true)}
              className={`w-full bg-slate-900 hover:bg-black text-white p-4 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-between font-bold text-sm transition-all duration-200 active:scale-95 ${cartBump ? 'scale-105' : 'scale-100'}`}
            >
              <div className="flex items-center gap-3">
                <span className="animate-pulse-glow bg-emerald-500 text-white text-xs w-7 h-7 rounded-full font-extrabold flex items-center justify-center">
                  {totalItemCount}
                </span>
                <span>View Order</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-base">
                {subtotal.toFixed(2)} {DEMO_RESTAURANT.currency_symbol}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────── */}
      <ItemModal
        item={activeModalItem}
        currencySymbol={DEMO_RESTAURANT.currency_symbol}
        onClose={() => setActiveModalItem(null)}
      />
      <CartDrawer
        restaurant={DEMO_RESTAURANT}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {/* Close sort dropdown on outside click */}
      {showSort && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
      )}
    </div>
  );
}
