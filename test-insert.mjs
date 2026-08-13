import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtitkjzialsxqwskfudx.supabase.co';
const supabaseAnonKey = 'sb_publishable_I5qeXfLg3ASoaiQ_7RE_Hg_FOCiIcFW';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log("Attempting to insert test order...");
  const { data, error } = await supabase.from('orders').insert({
    restaurant_id: '00000000-0000-0000-0000-000000000001',
    customer_name: "Test Customer",
    customer_phone: "212600000000",
    order_type: "delivery",
    delivery_address: "123 Test Street, Casa",
    notes: "Please ring the bell.",
    subtotal: 150.00,
    delivery_fee: 15.00,
    total_amount: 165.00,
    status: "pending"
  });

  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("Success:", data);
  }
}

testInsert();
