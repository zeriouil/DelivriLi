import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtitkjzialsxqwskfudx.supabase.co';
const supabaseAnonKey = 'sb_publishable_I5qeXfLg3ASoaiQ_7RE_Hg_FOCiIcFW';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRestaurant() {
  const { data, error } = await supabase.from('restaurants').select('*');
  console.log("Restaurants:", data);
  if (error) console.error("Error:", error);
}

checkRestaurant();
