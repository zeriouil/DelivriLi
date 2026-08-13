export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Restaurant, MenuItem } from "@/types";
import { Search, MapPin, Star, ArrowRight, Store, ArrowUpRight, Flame, Utensils } from "lucide-react";

export default async function MarketplacePage() {
  // Fetch active restaurants from Supabase
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*")
    .eq("is_active", true)
    .order("name");

  // Fetch some popular/active menu items to show as previews
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .eq("is_available", true);

  return (
    <div className="min-h-screen bg-slate-50 font-[Outfit]">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">DL</span>
            </div>
            <h1 className="font-black text-xl text-slate-900 tracking-tight">DelivriLi</h1>
          </div>
          <Link
            href="/signup"
            className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-2"
          >
            <Store className="w-4 h-4" />
            Partner with us
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Order food from your <br className="hidden md:block" />
            <span className="text-indigo-600">favorite restaurants.</span>
          </h2>
          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-8 font-medium">
            Fast delivery, live tracking, and the best local menus all in one place.
          </p>

          {/* Global Search Bar Placeholder */}
          <div className="max-w-xl mx-auto bg-white border-2 border-slate-100 rounded-2xl p-2 flex items-center shadow-sm focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 transition-all">
            <Search className="w-6 h-6 text-slate-400 ml-3" />
            <input
              type="text"
              placeholder="Search for restaurants or cuisines..."
              className="w-full px-4 py-3 outline-none text-slate-700 font-medium bg-transparent"
            />
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3 rounded-xl transition-colors">
              Find
            </button>
          </div>
        </div>
      </div>

      {/* Restaurants List */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-slate-900">Popular Restaurants</h3>
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
                className="group bg-white border border-slate-100 rounded-3xl overflow-hidden hover:shadow-xl hover:shadow-indigo-600/5 hover:border-indigo-100 transition-all active:scale-[0.98]"
              >
                {/* Image Placeholder */}
                <div className="w-full h-48 bg-slate-100 relative overflow-hidden">
                  {restaurant.logo_url ? (
                    <img
                      src={restaurant.logo_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-100 to-purple-50 flex items-center justify-center">
                      <Store className="w-12 h-12 text-indigo-300" />
                    </div>
                  )}
                  {/* Delivery time & New badges */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {isNew && (
                      <div className="bg-rose-500/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-black text-white shadow-sm flex items-center gap-1 animate-pulse">
                        <Flame className="w-3.5 h-3.5" /> NEW
                      </div>
                    )}
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                      25-40 min
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-black text-lg text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {restaurant.name}
                    </h4>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-slate-700">4.8</span>
                    </div>
                  </div>

                  <p className="text-slate-500 text-sm flex items-center gap-1.5 mb-4 line-clamp-1">
                    <MapPin className="w-4 h-4" />
                    {restaurant.address || "Casablanca, Morocco"}
                  </p>

                  <div className="flex items-center gap-3 border-t border-slate-50 pt-4">
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Delivery</p>
                      <p className="font-bold text-slate-700 text-sm">
                        {restaurant.delivery_fee === 0 ? "Free" : `${restaurant.delivery_fee} ${restaurant.currency_symbol}`}
                      </p>
                    </div>
                    <div className="flex-1 border-l border-slate-100 pl-3">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Min. Order</p>
                      <p className="font-bold text-slate-700 text-sm">
                        {restaurant.min_order_amount} {restaurant.currency_symbol}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
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
          <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center">
            <Store className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h4 className="text-xl font-black text-slate-900 mb-2">No restaurants found</h4>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              There are currently no active restaurants on the platform. If you're a restaurant owner, partner with us!
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-bold transition-colors"
            >
              Add Your Restaurant <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-600/20">
            <span className="text-white font-black text-xl">DL</span>
          </div>
          <p className="text-slate-400 font-medium text-sm">
            © {new Date().getFullYear()} DelivriLi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
