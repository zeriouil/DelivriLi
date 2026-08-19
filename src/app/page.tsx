"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Restaurant, MenuItem } from "@/types";
import { Search, MapPin, Star, ArrowRight, Store, ArrowUpRight, Flame, Utensils, Loader2, Download, StarHalf } from "lucide-react";

export default function MarketplacePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: rData } = await supabase
        .from("restaurants")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

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
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fef2f2]">
      {/* Header */}
      <header className="bg-white border-b border-red-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br from-red-600 to-red-800">
              <span className="text-white font-black text-xl font-heading">DL</span>
            </div>
            <h1 className="font-bold text-2xl text-red-950 tracking-tight font-heading">DelivriLi</h1>
          </div>
          <Link
            href="/signup"
            className="text-sm font-bold text-red-900 bg-red-50 px-5 py-2.5 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2 border border-red-200 shadow-sm"
          >
            <Store className="w-4 h-4" />
            Partner with us
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div 
        className="relative overflow-hidden bg-red-950"
        style={{
          backgroundImage: 'url("/hero-image.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60 z-0" />
        <div className="absolute inset-0 pointer-events-none opacity-20 zellige-bg mix-blend-overlay z-0" />
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/50 border border-red-500/30 text-red-100 text-sm font-bold mb-8 backdrop-blur-sm">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>4.9/5 on App Store</span>
            </div>
            <h2 className="text-5xl md:text-7xl text-white mb-6 font-heading leading-[1.1]">
              Authentic Moroccan Cuisine, <span className="text-yellow-400">Delivered.</span>
            </h2>
            <p className="text-red-100 text-lg md:text-xl max-w-xl mb-10 font-medium">
              Savour Tagine, Couscous, and more from the best local restaurants. Fast delivery, live tracking.
            </p>

            <div className="flex flex-wrap gap-4">
              <button className="bg-yellow-400 hover:bg-yellow-500 text-red-950 font-bold px-8 py-4 rounded-2xl flex items-center gap-3 shadow-lg transition-transform active:scale-95">
                <Download className="w-5 h-5" />
                Download App
              </button>
              <button className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-2xl flex items-center gap-3 backdrop-blur-sm border border-white/20 transition-all">
                <Store className="w-5 h-5" />
                Explore Web
              </button>
            </div>
          </div>
          
          {/* Device Mockup Graphic */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-3xl" />
            <div className="relative bg-white p-4 rounded-[40px] shadow-2xl border-4 border-red-900/50 transform rotate-[-5deg] hover:rotate-0 transition-all duration-500 max-w-sm mx-auto">
              <div className="bg-red-50 rounded-[24px] overflow-hidden border border-red-100">
                <div className="h-64 bg-red-600 flex flex-col items-center justify-center text-white p-6">
                   <Utensils className="w-16 h-16 mb-4 opacity-50" />
                   <div className="text-2xl font-heading font-bold text-center">Your favorite meals,<br/>hot & ready.</div>
                </div>
                <div className="p-6 space-y-4">
                   <div className="h-16 bg-white rounded-xl shadow-sm border border-red-100 flex items-center px-4 gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><Flame className="w-5 h-5 text-red-600"/></div>
                      <div className="flex-1">
                        <div className="h-3 w-24 bg-red-900/20 rounded-full mb-2"></div>
                        <div className="h-2 w-16 bg-red-900/10 rounded-full"></div>
                      </div>
                   </div>
                   <div className="h-16 bg-white rounded-xl shadow-sm border border-red-100 flex items-center px-4 gap-4">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"><Star className="w-5 h-5 text-yellow-600"/></div>
                      <div className="flex-1">
                        <div className="h-3 w-32 bg-red-900/20 rounded-full mb-2"></div>
                        <div className="h-2 w-20 bg-red-900/10 rounded-full"></div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Restaurants List */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-4xl text-red-950 font-heading font-bold">Featured Restaurants</h3>
        </div>

        {restaurants && restaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {restaurants.map((restaurant: Restaurant) => {
              const isNew = restaurant.created_at
                ? (new Date().getTime() - new Date(restaurant.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                : false;
              
              return (
              <Link
                key={restaurant.id}
                href={`/${restaurant.slug}`}
                className="group bg-white border border-red-200 rounded-3xl overflow-hidden hover:shadow-xl hover:shadow-red-600/10 hover:border-red-400 transition-all duration-300 active:scale-[0.98] flex flex-col block"
              >
                {/* Image */}
                <div className="w-full h-56 bg-red-50 relative overflow-hidden">
                  {restaurant.cover_image_url || restaurant.logo_url ? (
                    <img
                      src={restaurant.cover_image_url || restaurant.logo_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
                      <Store className="w-14 h-14 text-red-300" />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    {isNew && (
                      <div className="bg-red-600/95 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm flex items-center gap-1.5 animate-pulse">
                        <Flame className="w-4 h-4" /> NEW
                      </div>
                    )}
                    <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold text-red-950 shadow-sm border border-red-100">
                      25-40 min
                    </div>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-xl text-red-950 font-heading group-hover:text-red-600 transition-colors line-clamp-1">
                      {restaurant.name}
                    </h4>
                    <div className="flex items-center gap-1.5 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-200 flex-shrink-0">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-bold text-yellow-900">4.8</span>
                    </div>
                  </div>

                  {restaurant.description && (
                    <p className="text-red-900/60 text-sm line-clamp-2 mb-4 leading-relaxed">
                      {restaurant.description}
                    </p>
                  )}

                  <p className="text-red-900/60 text-sm flex items-center gap-2 mb-5 line-clamp-1 mt-auto">
                    <MapPin className="w-4 h-4 text-red-400" />
                    {restaurant.address || "Casablanca, Morocco"}
                  </p>

                  <div className="flex items-center gap-4 border-t border-red-100 pt-5">
                    <div className="flex-1">
                      <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Delivery</p>
                      <p className="font-bold text-red-950 text-sm">
                        {restaurant.delivery_fee === 0 ? <span className="text-green-600">Free</span> : `${restaurant.delivery_fee} ${restaurant.currency_symbol}`}
                      </p>
                    </div>
                    <div className="flex-1 border-l border-red-100 pl-4">
                      <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Min. Order</p>
                      <p className="font-bold text-red-950 text-sm">
                        {restaurant.min_order_amount} {restaurant.currency_symbol}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 group-hover:bg-red-600 group-hover:text-white text-red-600 flex items-center justify-center transition-all duration-200 shadow-sm">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            )})}
          </div>
        ) : (
          <div className="bg-white border-2 border-red-100 rounded-[32px] p-16 text-center shadow-sm">
            <Store className="w-20 h-20 text-red-200 mx-auto mb-6" />
            <h4 className="text-2xl font-black text-red-950 mb-3 font-heading">لا توجد مطاعم حتى الآن</h4>
            <p className="text-red-900/60 mb-8 max-w-lg mx-auto text-lg">
              There are currently no active restaurants on the platform. If you're a restaurant owner, partner with us!
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              Add Your Restaurant <ArrowUpRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-red-950 pt-16 pb-8 border-t-[6px] border-yellow-400">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl bg-gradient-to-br from-red-600 to-red-800">
            <span className="text-white font-black text-2xl font-heading">DL</span>
          </div>
          <h2 className="text-white font-heading font-bold text-2xl mb-2">DelivriLi</h2>
          <p className="text-red-400 font-medium text-sm mb-12">The best of Morocco, at your door.</p>
          
          <div className="border-t border-red-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-red-500/50 font-medium text-sm">
              © {new Date().getFullYear()} DelivriLi. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm font-medium text-red-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
