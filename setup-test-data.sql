-- 1. Create a dummy restaurant so we can attach orders to it
INSERT INTO public.restaurants (id, slug, name, phone_number)
VALUES ('00000000-0000-0000-0000-000000000001', 'test-restaurant', 'Test Restaurant', '212600000000')
ON CONFLICT (id) DO NOTHING;

-- 2. Temporarily allow anonymous viewing of orders for the Admin & Courier UI
-- Note: In production, you would use Supabase Auth and restrict this to 'authenticated' users
DROP POLICY IF EXISTS "Admin order view" ON public.orders;
CREATE POLICY "Admin order view" ON public.orders FOR SELECT USING (true);

-- 3. Allow anonymous updates to orders (for marking them as Ready / Delivered)
DROP POLICY IF EXISTS "Admin order update" ON public.orders;
CREATE POLICY "Admin order update" ON public.orders FOR UPDATE USING (true);
