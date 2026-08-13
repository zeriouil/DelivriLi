-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums
CREATE TYPE order_type AS ENUM ('delivery', 'pickup', 'dine_in');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');

-- 1. Restaurants Table
CREATE TABLE public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    phone_number VARCHAR(32) NOT NULL, -- Format: 2126XXXXXXXX (without + for wa.me)
    currency_code VARCHAR(10) DEFAULT 'MAD',
    currency_symbol VARCHAR(10) DEFAULT 'DH',
    address TEXT,
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    min_order_amount NUMERIC(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Menu Items Table
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    badge VARCHAR(50), -- e.g., 'Popular', 'Chef Special', 'Spicy'
    is_available BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Modifier Groups (e.g. "Choice of 3 Meats", "Select Sauces", "Extra Add-ons")
CREATE TABLE public.modifier_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    min_selection INT DEFAULT 0,
    max_selection INT DEFAULT 1,
    is_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Item Modifier Groups Junction Table
CREATE TABLE public.item_modifier_groups (
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    PRIMARY KEY (menu_item_id, modifier_group_id)
);

-- 6. Modifiers (Specific options inside a group)
CREATE TABLE public.modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    price_delta NUMERIC(10, 2) DEFAULT 0.00, -- Added cost (e.g. +5.00 DH)
    is_available BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_number SERIAL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    order_type order_type DEFAULT 'delivery',
    table_number VARCHAR(20),
    delivery_address TEXT,
    notes TEXT,
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    status order_status DEFAULT 'pending',
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Order Items Table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(10, 2) NOT NULL
);

-- 9. Order Item Modifiers Table (Snapshots selected options)
CREATE TABLE public.order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    group_name VARCHAR(150) NOT NULL,
    modifier_name VARCHAR(150) NOT NULL,
    price_delta NUMERIC(10, 2) DEFAULT 0.00
);

-- Indexes for maximum query efficiency
CREATE INDEX idx_categories_restaurant ON public.categories(restaurant_id, display_order);
CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id, category_id, is_available);
CREATE INDEX idx_modifiers_group ON public.modifiers(group_id, display_order);
CREATE INDEX idx_orders_restaurant_status ON public.orders(restaurant_id, status, created_at DESC);

-- Realtime Publication Enablement for Merchant POS Dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Setup
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;

-- Read Access for Customers (Anon & Authenticated)
CREATE POLICY "Public menu access" ON public.restaurants FOR SELECT USING (is_active = true);
CREATE POLICY "Public categories access" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public menu_items access" ON public.menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Public modifier_groups access" ON public.modifier_groups FOR SELECT USING (true);
CREATE POLICY "Public item_modifier_groups access" ON public.item_modifier_groups FOR SELECT USING (true);
CREATE POLICY "Public modifiers access" ON public.modifiers FOR SELECT USING (is_available = true);

-- Public Insert Access for Placing Orders
CREATE POLICY "Public order creation" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public order_items creation" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public order_item_modifiers creation" ON public.order_item_modifiers FOR INSERT WITH CHECK (true);

-- Authenticated Merchant Admin Policies (Dashboard Management)
CREATE POLICY "Admin order view" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin order update" ON public.orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin menu update" ON public.menu_items FOR ALL TO authenticated USING (true);
