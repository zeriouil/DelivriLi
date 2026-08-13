import { CartItem, CustomerDetails, Restaurant } from '@/types';

export function generateWhatsAppOrderUrl(
  restaurant: Restaurant,
  items: CartItem[],
  customer: CustomerDetails,
  subtotal: number,
  deliveryFee: number,
  grandTotal: number
): string {
  const symbol = restaurant.currency_symbol || 'DH';
  
  let text = `🛒 *NEW ORDER #${Math.floor(1000 + Math.random() * 9000)}*\n`;
  text += `📍 *${restaurant.name}*\n`;
  text += `-----------------------------------\n\n`;

  text += `👤 *Customer Details:*\n`;
  text += `• *Name:* ${customer.name}\n`;
  text += `• *Phone:* ${customer.phone}\n`;
  text += `• *Type:* ${customer.orderType.toUpperCase()}\n`;
  
  if (customer.orderType === 'dine_in' && customer.tableNumber) {
    text += `• *Table No:* ${customer.tableNumber}\n`;
  }
  if (customer.orderType === 'delivery' && customer.deliveryAddress) {
    text += `• *Address:* ${customer.deliveryAddress}\n`;
  }
  if (customer.notes) {
    text += `• *Notes:* _${customer.notes}_\n`;
  }

  text += `\n📋 *Order Items:*\n`;
  items.forEach((item, idx) => {
    text += `\n*${idx + 1}. ${item.menuItem.name}* (x${item.quantity}) — ${(item.unitPrice * item.quantity).toFixed(2)} ${symbol}\n`;
    
    if (item.selectedModifiers.length > 0) {
      const groupedMods: Record<string, string[]> = {};
      item.selectedModifiers.forEach((mod) => {
        if (!groupedMods[mod.groupName]) groupedMods[mod.groupName] = [];
        const extraPrice = mod.priceDelta > 0 ? ` (+${mod.priceDelta.toFixed(2)} ${symbol})` : '';
        groupedMods[mod.groupName].push(`${mod.modifierName}${extraPrice}`);
      });

      Object.entries(groupedMods).forEach(([groupName, mods]) => {
        text += `   ↳ _${groupName}:_ ${mods.join(', ')}\n`;
      });
    }

    if (item.instructions) {
      text += `   ↳ _Note:_ "${item.instructions}"\n`;
    }
  });

  text += `\n-----------------------------------\n`;
  text += `💵 *Subtotal:* ${subtotal.toFixed(2)} ${symbol}\n`;
  if (customer.orderType === 'delivery') {
    text += `🛵 *Delivery Fee:* ${deliveryFee.toFixed(2)} ${symbol}\n`;
  }
  text += `💰 *TOTAL AMOUNT:* *${grandTotal.toFixed(2)} ${symbol}*\n\n`;
  text += `⚡ _Sent via QuickMenu Digital PWA_`;

  const encodedText = encodeURIComponent(text);
  const cleanPhone = restaurant.phone_number.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
