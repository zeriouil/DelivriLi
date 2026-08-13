-- ==========================================
-- DELIVRILI MULTI-TENANT MARKETPLACE SCHEMA
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Ensure the 'restaurants' table exists and allows anonymous operations for the prototype
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    phone_number TEXT NOT NULL,
    currency_code TEXT DEFAULT 'MAD',
    currency_symbol TEXT DEFAULT 'DH',
    address TEXT,
    delivery_fee NUMERIC DEFAULT 15.00,
    min_order_amount NUMERIC DEFAULT 50.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Ensure 'categories' table exists
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Ensure 'menu_items' table exists
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC NOT NULL,
    image_url TEXT,
    badge TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Note: These policies allow anonymous operations for the sake of the prototype.
-- In production, you MUST use Supabase Auth and restrict INSERT/UPDATE to authenticated restaurant owners.
-- ==========================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Allow ANYONE to Read
DROP POLICY IF EXISTS "Allow public read restaurants" ON public.restaurants;
CREATE POLICY "Allow public read restaurants" ON public.restaurants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
CREATE POLICY "Allow public read categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read menu_items" ON public.menu_items;
CREATE POLICY "Allow public read menu_items" ON public.menu_items FOR SELECT USING (true);

-- Allow ANYONE to Insert (For prototype Sign Up and Menu Admin)
DROP POLICY IF EXISTS "Allow public insert restaurants" ON public.restaurants;
CREATE POLICY "Allow public insert restaurants" ON public.restaurants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert categories" ON public.categories;
CREATE POLICY "Allow public insert categories" ON public.categories FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert menu_items" ON public.menu_items;
CREATE POLICY "Allow public insert menu_items" ON public.menu_items FOR INSERT WITH CHECK (true);

-- Allow ANYONE to Delete (For prototype Menu Admin)
DROP POLICY IF EXISTS "Allow public delete menu_items" ON public.menu_items;
CREATE POLICY "Allow public delete menu_items" ON public.menu_items FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public delete categories" ON public.categories;
CREATE POLICY "Allow public delete categories" ON public.categories FOR DELETE USING (true);
