"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Restaurant, MenuItem } from "@/types";
import { Search, MapPin, Star, ArrowRight, Store, ArrowUpRight, Flame, Utensils, Loader2 } from "lucide-react";

export default function MarketplacePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch active restaurants from Supabase
      const { data: rData } = await supabase
        .from("restaurants")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }); // Show newest first

      // Fetch some popular/active menu items to show as previews
      const { data: mData } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true);

      if (rData) setRestaurants(rData);
      if (mData) setMenuItems(mData);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen zellige-bg">
      {/* Header */}
      <header className="bg-[#fdfaf5] border-b border-[#e4d5c1] sticky top-0 z-30 moroccan-border-bottom shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md" style={{background:'linear-gradient(135deg,#1e5b8c,#c1440e)'}}>
              <span className="text-white font-black text-sm">DL</span>
            </div>
            <h1 className="font-black text-xl text-[#2b2320] tracking-tight" style={{fontFamily:'var(--font-heading,Lalezar),sans-serif'}}>DelivriLi</h1>
          </div>
          <Link
            href="/signup"
            className="text-sm font-bold text-[#1e5b8c] bg-[#eef4fb] px-4 py-2 rounded-full hover:bg-[#d0e4f5] transition-colors flex items-center gap-2 border border-[#d0e4f5]"
          >
            <Store className="w-4 h-4" />
            Partner with us
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden" style={{background:'linear-gradient(135deg,#5c2006 0%,#c1440e 45%,#1e5b8c 100%)'}}>
        {/* Zellige overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'repeating-linear-gradient(45deg,rgba(255,255,255,.05) 0px,rgba(255,255,255,.05) 1px,transparent 1px,transparent 12px),repeating-linear-gradient(-45deg,rgba(232,169,58,.07) 0px,rgba(232,169,58,.07) 1px,transparent 1px,transparent 12px)'}} />
        {/* Saffron stripe bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{background:'linear-gradient(90deg,#e8a93a,#c1440e,#1e5b8c,#c1440e,#e8a93a)'}} />
        <div className="max-w-5xl mx-auto px-4 py-14 md:py-22 text-center relative z-10">
          <div className="inline-block mb-3 text-4xl animate-lantern">🏮</div>
          <h2 className="text-4xl md:text-6xl text-white mb-4" style={{fontFamily:'var(--font-heading,Lalezar),sans-serif',letterSpacing:'0.02em',lineHeight:1.15}}>
            تذوّق أصيل المأكولات المغربية
            <br className="hidden md:block" />
            <span style={{color:'#e8a93a'}}>على طبق واحد.</span>
          </h2>
          <p className="text-orange-100 text-lg md:text-xl max-w-2xl mx-auto mb-8 font-medium">
            Savour authentic Moroccan flavours — fast delivery, live tracking, the best local restaurants.
          </p>

          {/* Moroccan Category Chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[['🫕','Tagine'],['🍚','Couscous'],['🥐','Pastilla'],['🫓','Msemen'],['🍲','Harira'],['🧆','Kefta'],['🍋','Chermoula']].map(([emoji,label])=>(
              <span key={label} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold text-white border border-white/30 hover:bg-white/20 transition-colors cursor-pointer" style={{background:'rgba(255,255,255,.12)',backdropFilter:'blur(8px)'}}>
                {emoji} {label}
              </span>
            ))}
          </div>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto bg-[#fdfaf5] border-2 border-[#e4d5c1] rounded-2xl p-2 flex items-center shadow-2xl focus-within:border-[#e8a93a] focus-within:ring-4 focus-within:ring-[#e8a93a]/20 transition-all">
            <Search className="w-6 h-6 text-[#a89070] ml-3" />
            <input
              type="text"
              placeholder="Search restaurants or dishes..."
              className="w-full px-4 py-3 outline-none text-[#2b2320] font-medium bg-transparent placeholder-[#a89070]"
            />
            <button className="btn-primary px-6 py-3">
              Find
            </button>
          </div>
        </div>
      </div>

      {/* Restaurants List */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl text-[#2b2320]" style={{fontFamily:'var(--font-heading,Lalezar),sans-serif'}}>🍽️ المطاعم الشعبية</h3>
        </div>

        {restaurants && restaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant: Restaurant) => {
              const isNew = restaurant.created_at
                ? (new Date().getTime() - new Date(restaurant.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                : false;
              
              return (
              <Link
                key={restaurant.id}
                href={`/${restaurant.slug}`}
                className="group bg-[#fdfaf5] border border-[#e4d5c1] rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-[#c1440e]/12 hover:border-[#c1440e]/40 transition-all duration-300 active:scale-[0.98]"
              >
                {/* Image with Moroccan arch clip */}
                <div className="w-full h-48 bg-[#f5ede0] relative overflow-hidden arch-clip">
                  {restaurant.cover_image_url || restaurant.logo_url ? (
                    <img
                      src={restaurant.cover_image_url || restaurant.logo_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{background:'linear-gradient(135deg,#fdf2ee,#d0e4f5,#f5ede0)'}}>
                      <Store className="w-12 h-12 text-[#c1440e]" style={{opacity:.4}} />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {(restaurant.created_at && (new Date().getTime()-new Date(restaurant.created_at).getTime())<7*24*60*60*1000) && (
                      <div className="bg-[#c1440e]/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-black text-white shadow-sm flex items-center gap-1 animate-pulse">
                        <Flame className="w-3.5 h-3.5" /> NEW
                      </div>
                    )}
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-[#2b2320] shadow-sm">
                      25-40 min
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-lg text-[#2b2320] group-hover:text-[#c1440e] transition-colors line-clamp-1" style={{fontFamily:'var(--font-heading,Lalezar),sans-serif'}}>
                      {restaurant.name}
                    </h4>
                    <div className="flex items-center gap-1 bg-[#f5ede0] px-2 py-1 rounded-lg flex-shrink-0">
                      <Star className="w-3.5 h-3.5 text-[#e8a93a] fill-[#e8a93a]" />
                      <span className="text-xs font-bold text-[#2b2320]">4.8</span>
                    </div>
                  </div>

                  {restaurant.description && (
                    <p className="text-slate-500 text-sm line-clamp-2 mb-3 leading-relaxed">
                      {restaurant.description}
                    </p>
                  )}

                  <p className="text-slate-500 text-sm flex items-center gap-1.5 mb-4 line-clamp-1">
                    <MapPin className="w-4 h-4" />
                    {restaurant.address || "Casablanca, Morocco"}
                  </p>

                  <div className="flex items-center gap-3 border-t border-[#e4d5c1] pt-4">
                    <div className="flex-1">
                      <p className="text-xs text-[#a89070] font-medium uppercase tracking-wider">Delivery</p>
                      <p className="font-bold text-[#2b2320] text-sm">
                        {restaurant.delivery_fee === 0 ? <span className="text-[#4a6741]">Free</span> : `${restaurant.delivery_fee} ${restaurant.currency_symbol}`}
                      </p>
                    </div>
                    <div className="flex-1 border-l border-[#e4d5c1] pl-3">
                      <p className="text-xs text-[#a89070] font-medium uppercase tracking-wider">Min. Order</p>
                      <p className="font-bold text-[#2b2320] text-sm">
                        {restaurant.min_order_amount} {restaurant.currency_symbol}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#f5ede0] group-hover:bg-[#1e5b8c] group-hover:text-white text-[#a89070] flex items-center justify-center transition-all duration-200">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                  
                  {/* Food Previews */}
                  {(() => {
                    const rItems = (menuItems || []).filter((i: MenuItem) => i.restaurant_id === restaurant.id).slice(0, 3);
                    if (rItems.length > 0) {
                      return (
                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Featured Items</p>
                          <div className="flex items-center gap-2">
                            {rItems.map((item: MenuItem) => (
                              <div key={item.id} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col items-center text-center gap-1">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover shadow-sm" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                    <Utensils className="w-4 h-4 text-slate-300" />
                                  </div>
                                )}
                                <span className="text-[10px] font-bold text-slate-700 line-clamp-1 w-full">{item.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </Link>
            )})}
          </div>
        ) : (
          <div className="bg-[#fffdf9] border border-[#e8ddd4] rounded-3xl p-12 text-center">
            <Store className="w-16 h-16 text-[#e8ddd4] mx-auto mb-4" />
            <h4 className="text-xl font-black text-[#2c1810] mb-2" style={{fontFamily: 'Amiri, Georgia, serif'}}>لا توجد مطاعم حتى الآن</h4>
            <p className="text-[#a8917e] mb-6 max-w-md mx-auto">
              There are currently no active restaurants on the platform. If you're a restaurant owner, partner with us!
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#c1440e] hover:bg-[#a33a0c] text-white px-6 py-3 rounded-full font-bold transition-colors"
            >
              Add Your Restaurant <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="moroccan-border-top py-14 mt-12" style={{background:'linear-gradient(135deg,#2b2320,#5c2006)'}}>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl" style={{background:'linear-gradient(135deg,#1e5b8c,#c1440e)'}}>
            <span className="text-white font-black text-xl">DL</span>
          </div>
          <p className="text-3xl mb-2 animate-lantern">🏮</p>
          <p className="text-[#e8a93a] font-medium text-base mb-1" style={{fontFamily:'var(--font-heading,Lalezar),sans-serif'}}>مرحباً بكم في ديليفريلي</p>
          <p className="text-orange-200/50 font-medium text-xs">
            © {new Date().getFullYear()} DelivriLi · Casablanca, Maroc
          </p>
        </div>
      </footer>
    </div>
  );
}
