"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Restaurant, MenuItem } from "@/types";
import {
  MapPin,
  Star,
  ArrowRight,
  Store,
  ArrowUpRight,
  Flame,
  Utensils,
  Loader2,
  Download,
} from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Iphone } from "@/components/ui/iphone";
import { MagicCard } from "@/components/ui/magic-card";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Particles } from "@/components/ui/particles";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ShineBorder } from "@/components/ui/shine-border";
import { SparklesText } from "@/components/ui/sparkles-text";
import { TextAnimate } from "@/components/ui/text-animate";
import { WordRotate } from "@/components/ui/word-rotate";
import { cn } from "@/lib/utils";

const FALLBACK_DISHES = [
  { name: "Tagine", emoji: "🍲" },
  { name: "Couscous", emoji: "🌾" },
  { name: "Pastilla", emoji: "🥧" },
  { name: "Harira", emoji: "🥣" },
  { name: "Mint tea", emoji: "🍵" },
  { name: "Msemen", emoji: "🥞" },
];

const REVIEWS = [
  { name: "Amine", city: "Casablanca", body: "Hot tagine in 28 minutes. Tracking was spot on." },
  { name: "Sara", city: "Rabat", body: "The menu feels like a real restaurant, not a PDF." },
  { name: "Youssef", city: "Marrakech", body: "Ordered couscous for the family. Perfect." },
  { name: "Lina", city: "Tangier", body: "Live map + WhatsApp confirmation. Super easy." },
];

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

  const dishCards = useMemo(() => {
    const withImages = menuItems.filter((item) => item.image_url).slice(0, 10);
    if (withImages.length >= 4) {
      return withImages.map((item) => ({
        name: item.name,
        image: item.image_url as string,
      }));
    }
    return FALLBACK_DISHES.map((dish) => ({ name: dish.name, emoji: dish.emoji }));
  }, [menuItems]);

  const phoneSrc =
    restaurants.find((r) => r.cover_image_url)?.cover_image_url ||
    restaurants.find((r) => r.logo_url)?.logo_url ||
    "/hero-image.jpg";

  if (loading) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fef2f2] overflow-x-hidden">
      <ScrollProgress />

      <header className="bg-white/80 backdrop-blur-xl border-b border-red-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br from-red-600 to-red-800">
              <span className="text-white font-black text-xl font-heading">DL</span>
            </div>
            <h1 className="font-bold text-2xl text-red-950 tracking-tight font-heading">DelivriLi</h1>
          </Link>
          <Link href="/signup">
            <ShimmerButton
              background="rgb(127, 29, 29)"
              shimmerColor="#facc15"
              className="shadow-md text-sm font-bold"
            >
              <span className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                Partner with us
              </span>
            </ShimmerButton>
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-red-950">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: 'url("/hero-image.jpg")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-red-950/80 to-black/70" />
        <Particles className="absolute inset-0" quantity={70} color="#facc15" size={0.5} />
        <AnimatedGridPattern
          numSquares={28}
          maxOpacity={0.18}
          duration={3}
          className="absolute inset-0 text-yellow-400/40 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
        />

        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <BlurFade delay={0.05}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-400/30 bg-white/5 backdrop-blur-sm mb-8">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <AnimatedShinyText className="mx-0 text-sm font-bold text-yellow-100/80 via-yellow-50">
                  4.9/5 from hungry locals
                </AnimatedShinyText>
              </div>
            </BlurFade>

            <TextAnimate
              animation="blurInUp"
              by="word"
              as="h2"
              className="text-5xl md:text-7xl text-white mb-4 font-heading leading-[1.1]"
            >
              Authentic Moroccan Cuisine,
            </TextAnimate>
            <SparklesText
              className="text-5xl md:text-7xl font-heading text-yellow-400 mb-6"
              colors={{ first: "#facc15", second: "#ffffff" }}
              sparklesCount={8}
            >
              Delivered.
            </SparklesText>

            <p className="text-red-100 text-lg md:text-xl max-w-xl mb-2 font-medium">
              Savour
            </p>
            <WordRotate
              className="text-yellow-300 font-heading text-3xl md:text-4xl"
              words={["Tagine", "Couscous", "Pastilla", "Harira"]}
            />
            <p className="text-red-100 text-lg md:text-xl max-w-xl mb-4 font-medium">
              from the best local restaurants. Fast delivery, live tracking.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <ShimmerButton background="rgb(250, 204, 21)" shimmerColor="#7f1d1d" className="text-red-950 font-bold">
                <span className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Download App
                </span>
              </ShimmerButton>
              <a href="#restaurants">
                <ShimmerButton background="rgba(255,255,255,0.12)" className="border border-white/20 font-bold">
                  <span className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Explore restaurants
                  </span>
                </ShimmerButton>
              </a>
            </div>
          </div>

          <BlurFade delay={0.2} className="hidden md:flex justify-center">
            <div className="relative w-[260px]">
              <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-3xl" />
              <Iphone src={phoneSrc} className="relative drop-shadow-2xl" />
            </div>
          </BlurFade>
        </div>
      </section>

      <div className="relative bg-[#fef2f2] py-6 border-y border-red-100">
        <Marquee pauseOnHover className="[--duration:28s]">
          {dishCards.map((dish, i) => (
            <div
              key={`${dish.name}-${i}`}
              className="flex items-center gap-3 rounded-2xl bg-white border border-red-100 px-4 py-2 shadow-sm"
            >
              {"image" in dish && dish.image ? (
                <img src={dish.image} alt="" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <span className="text-2xl">{"emoji" in dish ? dish.emoji : "🍽️"}</span>
              )}
              <span className="font-bold text-red-950 whitespace-nowrap">{dish.name}</span>
            </div>
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#fef2f2]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#fef2f2]" />
      </div>

      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { value: restaurants.length || 12, suffix: "+", label: "Restaurants" },
          { value: 28, suffix: " min", label: "Avg. delivery" },
          { value: 4.9, suffix: "", label: "Guest rating", decimals: 1 },
          { value: menuItems.length || 80, suffix: "+", label: "Dishes" },
        ].map((stat) => (
          <div key={stat.label} className="relative overflow-hidden rounded-3xl bg-white border border-red-100 p-6 text-center">
            <ShineBorder shineColor={["#dc2626", "#eab308", "#991b1b"]} borderWidth={1} />
            <div className="text-3xl md:text-4xl font-heading font-bold text-red-950">
              <NumberTicker value={stat.value} decimalPlaces={"decimals" in stat ? stat.decimals : 0} />
              {stat.suffix}
            </div>
            <p className="mt-2 text-sm font-bold text-red-800/70">{stat.label}</p>
          </div>
        ))}
      </section>

      <main id="restaurants" className="max-w-6xl mx-auto px-6 pb-16">
        <BlurFade>
          <h3 className="text-4xl text-red-950 font-heading font-bold mb-10">Featured Restaurants</h3>
        </BlurFade>

        {restaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {restaurants.map((restaurant, idx) => {
              const isNew = restaurant.created_at
                ? new Date().getTime() - new Date(restaurant.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
                : false;

              return (
                <BlurFade key={restaurant.id} delay={0.08 * idx}>
                  <Link href={`/${restaurant.slug}`} className="block h-full">
                    <MagicCard
                      className="h-full rounded-3xl"
                      gradientFrom="#dc2626"
                      gradientTo="#eab308"
                      gradientColor="#fecaca55"
                    >
                      <article className="bg-white rounded-3xl overflow-hidden flex flex-col h-full">
                        <div className="w-full h-56 bg-red-50 relative overflow-hidden">
                          {restaurant.cover_image_url || restaurant.logo_url ? (
                            <img
                              src={restaurant.cover_image_url || restaurant.logo_url}
                              alt={restaurant.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
                              <Store className="w-14 h-14 text-red-300" />
                            </div>
                          )}
                          <div className="absolute bottom-4 right-4 flex items-center gap-2">
                            {isNew && (
                              <div className="bg-red-600/95 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm flex items-center gap-1.5">
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
                            <h4 className="font-bold text-xl text-red-950 font-heading line-clamp-1">
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
                                {restaurant.delivery_fee === 0 ? (
                                  <span className="text-green-600">Free</span>
                                ) : (
                                  `${restaurant.delivery_fee} ${restaurant.currency_symbol}`
                                )}
                              </p>
                            </div>
                            <div className="flex-1 border-l border-red-100 pl-4">
                              <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Min. Order</p>
                              <p className="font-bold text-red-950 text-sm">
                                {restaurant.min_order_amount} {restaurant.currency_symbol}
                              </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                              <ArrowRight className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      </article>
                    </MagicCard>
                  </Link>
                </BlurFade>
              );
            })}
          </div>
        ) : (
          <div className="relative bg-white border border-red-100 rounded-[32px] p-16 text-center overflow-hidden">
            <ShineBorder shineColor={["#dc2626", "#eab308"]} />
            <Utensils className="w-20 h-20 text-red-200 mx-auto mb-6" />
            <h4 className="text-2xl font-black text-red-950 mb-3 font-heading">لا توجد مطاعم حتى الآن</h4>
            <p className="text-red-900/60 mb-8 max-w-lg mx-auto text-lg">
              There are currently no active restaurants on the platform. If you&apos;re a restaurant owner, partner with us!
            </p>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-bold">
              Add Your Restaurant <ArrowUpRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </main>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h3 className="text-3xl text-red-950 font-heading font-bold mb-8">Loved in Morocco</h3>
        <div className="relative">
          <Marquee pauseOnHover className="[--duration:36s]">
            {REVIEWS.map((review) => (
              <figure
                key={review.name}
                className={cn(
                  "relative w-72 overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-sm"
                )}
              >
                <figcaption className="font-bold text-red-950">{review.name}</figcaption>
                <p className="text-xs font-medium text-red-400 mb-2">{review.city}</p>
                <blockquote className="text-sm text-red-900/70">{review.body}</blockquote>
              </figure>
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#fef2f2]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#fef2f2]" />
        </div>
      </section>

      <footer className="relative overflow-hidden bg-red-950 pt-16 pb-8 border-t-[6px] border-yellow-400">
        <BorderBeam colorFrom="#facc15" colorTo="#dc2626" size={120} duration={10} />
        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
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
