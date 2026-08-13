export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  phone_number: string; // e.g. "212612345678"
  currency_code: string; // 'MAD'
  currency_symbol: string; // 'DH'
  address?: string;
  delivery_fee: number;
  min_order_amount: number;
  is_active: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface Modifier {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_available: boolean;
  display_order: number;
}

export interface ModifierGroup {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  min_selection: number;
  max_selection: number;
  is_required: boolean;
  modifiers: Modifier[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
  badge?: string;
  is_available: boolean;
  modifier_groups?: ModifierGroup[];
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  modifierId: string;
  modifierName: string;
  priceDelta: number;
}

export interface CartItem {
  cartItemId: string; // Unique hash/id for item + modifier combination
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  unitPrice: number; // base_price + sum(modifiers price_delta)
  totalPrice: number; // unitPrice * quantity
  instructions?: string;
}

export type OrderType = 'delivery' | 'pickup' | 'dine_in';

export interface CustomerDetails {
  name: string;
  phone: string;
  orderType: OrderType;
  tableNumber?: string;
  deliveryAddress?: string;
  notes?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'out_for_delivery' | 'arrived' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id?: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  order_type: OrderType;
  table_number?: string;
  delivery_address?: string;
  notes?: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: OrderStatus;
  whatsapp_sent: boolean;
  created_at: string;
  updated_at: string;
}
