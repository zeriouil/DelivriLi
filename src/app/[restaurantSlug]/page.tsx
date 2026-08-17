'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, ShoppingBag, MapPin, Star, Clock, Flame, Heart,
  ChevronDown, X, Zap, Tag, TrendingUp, Loader2, Store, Utensils
} from 'lucide-react';
import { MenuItem, Category, Restaurant } from '@/types';
import { useCart } from '@/context/cart-context';
import { ItemModal } from '@/components/customer/item-modal';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { supabase } from '@/lib/supabase';

const BADGE_STYLE: Record<string, string> = {
  'Best Seller': 'bg-yellow-400/20 text-yellow-700 border border-yellow-300',
  'Chef Favorite': 'bg-red-400/20 text-red-700 border border-red-300',
  'New': 'bg-blue-400/20 text-blue-700 border border-blue-300',
  'Popular': 'bg-orange-400/20 text-orange-700 border border-orange-300',
};

type SortOption = 'default' | 'price_asc' | 'price_desc';

const PROMOS = [
  '🎉 Free delivery on orders above 100 DH',
  '⚡ Order in 30 seconds — Track in real time',
  '🌶️ New spicy menu items just dropped!',
];

const ITEM_CALORIES: Record<string, string> = {};

export default function CustomerMenuPage({ params }: { params: { restaurantSlug: string } }) {
  const { totalItemCount, subtotal, isCartOpen, setIsCartOpen } = useCart();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalItem, setActiveModalItem] = useState<MenuItem | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showSort, setShowSort] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [promoIdx, setPromoIdx] = useState(0);
  const [cartBump, setCartBump] = useState(false);
  const prevCount = useRef(totalItemCount);

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('menu_favourites');
      if (saved) setFavourites(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPromoIdx(i => (i + 1) % PROMOS.length), 4000);
    return () => clearInterval(t);
  }, []);

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
    return <div className="min-h-screen flex items-center justify-center bg-red-50"><Loader2 className="w-10 h-10 animate-spin text-red-600" /></div>;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
        <Store className="w-16 h-16 text-red-200 mb-4" />
        <h2 className="text-2xl font-black text-red-950 mb-2 font-heading">Restaurant Not Found</h2>
        <p className="text-red-900/60">The restaurant you are looking for does not exist or has been removed.</p>
      </div>
    );
  }

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
    <div className="min-h-screen text-red-950 pb-28 bg-[#fef2f2] zellige-bg">
      {/* ── Hero Header ─────────────────────────────── */}
      <header 
        className="relative overflow-hidden text-white pt-10 pb-8 px-4 rounded-b-[2.5rem] shadow-xl bg-gradient-to-br from-red-950 via-red-800 to-red-600"
        style={restaurant.cover_image_url
          ? { backgroundImage: `url(${restaurant.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : {}}
      >
        {restaurant.cover_image_url && <div className="absolute inset-0 bg-black/50 z-0"></div>}

        {!restaurant.cover_image_url && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30 zellige-bg"></div>
        )}

        <div className="relative z-10 max-w-lg mx-auto">
          {/* Logo + Info */}
          <div className="flex items-center gap-5 mb-6">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-20 h-20 rounded-[20px] border-2 border-white/30 object-cover shadow-xl flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-[20px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl flex-shrink-0">
                <Store className="w-10 h-10 text-white/80" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-black tracking-tight font-heading truncate text-white drop-shadow-md">{restaurant.name}</h1>
              {restaurant.description && (
                <p className="text-red-100 text-sm mt-1.5 line-clamp-2 leading-snug drop-shadow-sm font-medium">
                  {restaurant.description}
                </p>
              )}
              <p className="text-yellow-400 text-xs flex items-center gap-1.5 mt-2 font-bold drop-shadow-sm">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{restaurant.address || 'Casablanca, Morocco'}</span>
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="flex items-center gap-1 text-xs bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 font-bold shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> 4.8
                </span>
                <span className="flex items-center gap-1 text-xs bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 font-bold shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-white" /> 25-40 min
                </span>
              </div>
            </div>
          </div>

          {/* Promo Banner */}
          <div className="mb-5 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3 text-sm font-bold backdrop-blur-md overflow-hidden shadow-inner">
            <Tag className="w-4 h-4 flex-shrink-0 text-yellow-400" />
            <span className="animate-fade-in text-red-50" key={promoIdx}>{PROMOS[promoIdx]}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-red-300" />
            <input
              id="menu-search"
              type="text"
              placeholder="Search delicious items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/95 text-red-950 placeholder-red-300 pl-12 pr-10 py-3.5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-yellow-400/50 focus:outline-none shadow-lg transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Sticky Categories + Sort ─────────────────── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-red-100 py-3.5 px-4 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar flex-1 pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-red-50 text-red-900 hover:bg-red-100 border border-red-100'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  selectedCategory === cat.id
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-red-50 text-red-900 hover:bg-red-100 border border-red-100'
                }`}
              >
                {cat.name}
                <span className={`text-[10px] rounded-md px-1.5 py-0.5 font-bold ${
                  selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-white text-red-600 border border-red-100'
                }`}>
                  {itemCountByCat(cat.id)}
                </span>
              </button>
            ))}
          </div>

          {/* Sort button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowSort(s => !s)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white border border-red-200 hover:border-red-400 hover:bg-red-50 text-red-900 transition-all shadow-sm"
            >
              <TrendingUp className="w-4 h-4" />
              Sort
              <ChevronDown className={`w-4 h-4 transition-transform ${showSort ? 'rotate-180' : ''}`} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-3 bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden z-50 w-48 animate-scale-in">
                {([
                  ['default',    'Default'],
                  ['price_asc',  'Price: Low → High'],
                  ['price_desc', 'Price: High → Low'],
                ] as [SortOption, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setSortBy(val); setShowSort(false); }}
                    className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors ${
                      sortBy === val ? 'bg-red-50 text-red-600' : 'text-red-950 hover:bg-red-50/50'
                    }`}
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
      <main className="max-w-lg mx-auto px-4 mt-6 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in bg-white rounded-3xl border border-red-100 shadow-sm">
            <div className="bg-red-50 p-6 rounded-full mb-6">
               <Search className="w-12 h-12 text-red-300" />
            </div>
            <h3 className="font-bold text-red-950 text-xl font-heading mb-2">No items found</h3>
            <p className="text-red-900/60 text-base max-w-xs">We couldn't find anything matching your search in this category.</p>
            <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} className="mt-8 px-8 py-3.5 btn-primary text-sm rounded-xl">
              Clear All Filters
            </button>
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => item.is_available && setActiveModalItem(item)}
              className={`bg-white rounded-[24px] shadow-sm border border-red-100 overflow-hidden card-lift animate-slide-up hover:shadow-md transition-all ${
                !item.is_available ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-red-300'
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex p-4 gap-4">
                {/* Text side */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    {item.badge && (
                      <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${BADGE_STYLE[item.badge] || 'bg-red-50 text-red-600'}`}>
                        {item.badge}
                      </span>
                    )}
                    {!item.is_available && (
                      <span className="inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-red-100 text-red-500">
                        Sold Out
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-red-950 text-lg leading-tight font-heading">{item.name}</h3>
                  <p className="text-red-900/60 text-sm line-clamp-2 leading-relaxed">{item.description}</p>
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-black text-lg text-red-600">
                      {Number(item.base_price).toFixed(2)} {restaurant.currency_symbol}
                    </span>
                    {ITEM_CALORIES[item.id] && (
                      <span className="flex items-center gap-1.5 text-xs text-red-400 font-bold bg-red-50 px-2 py-1 rounded-md">
                        <Flame className="w-3.5 h-3.5" />
                        {ITEM_CALORIES[item.id]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Image side */}
                <div className="w-32 h-32 relative flex-shrink-0 self-center">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-[20px] bg-red-50 shadow-sm border border-red-100" />
                  ) : (
                    <div className="w-full h-full rounded-[20px] flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 border border-red-100 shadow-inner">
                      <Utensils className="w-10 h-10 text-red-300" />
                    </div>
                  )}
                  {/* Favourite button */}
                  <button
                    onClick={e => toggleFavourite(e, item.id)}
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all border ${
                      favourites.has(item.id)
                        ? 'bg-red-500 text-white border-red-500 scale-110'
                        : 'bg-white/90 backdrop-blur-sm text-red-300 border-white hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${favourites.has(item.id) ? 'fill-white' : ''}`} />
                  </button>
                  {/* Add button */}
                  {item.is_available && (
                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-red-950 p-2.5 rounded-2xl shadow-lg border-2 border-white hover:bg-yellow-500 transition-colors">
                      <ShoppingBag className="w-5 h-5" />
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
        <div className="fixed bottom-6 left-0 right-0 z-40 px-6 animate-slide-up pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className={`w-full bg-red-600 text-white p-4.5 rounded-[24px] shadow-2xl shadow-red-600/30 flex items-center justify-between font-bold text-base transition-all duration-300 active:scale-95 border-2 border-red-500 hover:bg-red-700 ${cartBump ? 'scale-105' : 'scale-100'}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-sm w-9 h-9 rounded-full font-black flex items-center justify-center animate-pulse-glow bg-yellow-400 text-red-950 shadow-inner">
                  {totalItemCount}
                </span>
                <span className="tracking-wide">View Order</span>
              </div>
              <span className="font-black text-xl text-yellow-400 bg-red-900/30 px-3 py-1 rounded-xl">
                {subtotal.toFixed(2)} {restaurant.currency_symbol}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────── */}
      <ItemModal
        item={activeModalItem}
        currencySymbol={restaurant?.currency_symbol || 'DH'}
        onClose={() => setActiveModalItem(null)}
      />
      <CartDrawer
        restaurant={restaurant!}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {showSort && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
      )}
    </div>
  );
}
