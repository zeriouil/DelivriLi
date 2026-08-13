'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, ShoppingBag, MapPin, Star, Clock, Flame, Heart,
  ChevronDown, X, Zap, Tag, TrendingUp, Loader2, Store
} from 'lucide-react';
import { MenuItem, Category, Restaurant } from '@/types';
import { useCart } from '@/context/cart-context';
import { ItemModal } from '@/components/customer/item-modal';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { supabase } from '@/lib/supabase';

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

const ITEM_ICONS: Record<string, string> = {};
const ITEM_CALORIES: Record<string, string> = {};

/* ────── Component ────────────────────────────────────── */
export default function CustomerMenuPage({ params }: { params: { restaurantSlug: string } }) {
  const { totalItemCount, subtotal, isCartOpen, setIsCartOpen } = useCart();
  
  // Data State
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalItem, setActiveModalItem] = useState<MenuItem | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showSort, setShowSort] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [promoIdx, setPromoIdx] = useState(0);
  const [cartBump, setCartBump] = useState(false);
  const prevCount = useRef(totalItemCount);

  // Load data from Supabase
  useEffect(() => {
    async function fetchMenu() {
      const { data: rData } = await supabase.from('restaurants').select('*').eq('slug', params.restaurantSlug).single();
      if (!rData) {
        setLoading(false);
        return;
      }
      setRestaurant(rData);

      const { data: cData } = await supabase.from('categories').select('*').eq('restaurant_id', rData.id).order('display_order');
      setCategories(cData || []);

      const { data: iData } = await supabase.from('menu_items').select('*').eq('restaurant_id', rData.id).order('name');
      setItems(iData || []);
      
      setLoading(false);
    }
    fetchMenu();
  }, [params.restaurantSlug]);

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <Store className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">Restaurant Not Found</h2>
        <p className="text-slate-500">The restaurant you are looking for does not exist or has been removed.</p>
      </div>
    );
  }

  // Filter + Sort
  let filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(q) ||
                          item.description?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  if (sortBy === 'price_asc') filteredItems = [...filteredItems].sort((a, b) => a.base_price - b.base_price);
  if (sortBy === 'price_desc') filteredItems = [...filteredItems].sort((a, b) => b.base_price - a.base_price);

  const itemCountByCat = (catId: string) => items.filter(i => i.category_id === catId).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 font-[Outfit]">
      {/* ── Hero Header ─────────────────────────────── */}
      <header 
        className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 text-white pt-10 pb-8 px-4 rounded-b-[2rem] shadow-xl"
        style={restaurant.cover_image_url ? { backgroundImage: `url(${restaurant.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {/* Dark Overlay for readability when using image */}
        {restaurant.cover_image_url && <div className="absolute inset-0 bg-black/50 z-0"></div>}

        {/* Animated blobs (hide if using image) */}
        {!restaurant.cover_image_url && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-blob absolute -top-10 -right-10 w-52 h-52 rounded-full bg-teal-400/30 blur-3xl" />
            <div className="animate-blob absolute bottom-0 -left-12 w-44 h-44 rounded-full bg-emerald-900/40 blur-2xl" style={{ animationDelay: '-3s' }} />
          </div>
        )}

        <div className="relative z-10 max-w-md mx-auto">
          {/* Logo + Info */}
          <div className="flex items-center gap-4 mb-5">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-16 h-16 rounded-2xl border border-white/30 object-cover shadow-lg flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
                🍽️
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black tracking-tight truncate">{restaurant.name}</h1>
              {restaurant.description && (
                <p className="text-emerald-50 text-sm mt-1 line-clamp-2 leading-tight">
                  {restaurant.description}
                </p>
              )}
              <p className="text-emerald-100/80 text-xs flex items-center gap-1 mt-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{restaurant.address || 'Casablanca, Morocco'}</span>
              </p>
              {/* Rating + delivery meta */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5 font-semibold">
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> 4.8
                </span>
                <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5 font-semibold">
                  <Clock className="w-3 h-3" /> 25-40 min
                </span>
                <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5 font-semibold">
                  <Zap className="w-3 h-3 text-amber-300" /> {restaurant.delivery_fee === 0 ? 'Free' : `${restaurant.delivery_fee} ${restaurant.currency_symbol}`} delivery
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
              placeholder="Search items..."
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
            {categories.map(cat => (
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
                      {Number(item.base_price).toFixed(2)} {restaurant.currency_symbol}
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
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl bg-slate-100" />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center text-4xl shadow-inner overflow-hidden">
                      {ITEM_ICONS[item.id] || '🍽️'}
                    </div>
                  )}
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
                {subtotal.toFixed(2)} {restaurant.currency_symbol}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────── */}
      <ItemModal
        item={activeModalItem}
        currencySymbol={restaurant.currency_symbol}
        onClose={() => setActiveModalItem(null)}
      />
      <CartDrawer
        restaurant={restaurant}
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
