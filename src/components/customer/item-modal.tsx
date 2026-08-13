'use client';

import React, { useState, useEffect } from 'react';
import { MenuItem, SelectedModifier } from '@/types';
import { useCart } from '@/context/cart-context';
import { X, Plus, Minus, Check, AlertCircle, Flame, Clock, ChefHat } from 'lucide-react';

interface ItemModalProps {
  item: MenuItem | null;
  currencySymbol?: string;
  onClose: () => void;
}

const ITEM_ICONS: Record<string, string> = {
  m1: '🌮', m2: '🍔', m3: '🧀', m4: '🍋', m5: '🍟', m6: '🍗',
};
const ITEM_GRADIENTS: Record<string, string> = {
  m1: 'from-amber-400/30 to-orange-300/20',
  m2: 'from-rose-400/30 to-red-300/20',
  m3: 'from-yellow-300/30 to-amber-200/20',
  m4: 'from-lime-400/30 to-green-300/20',
  m5: 'from-orange-400/30 to-yellow-300/20',
  m6: 'from-rose-300/30 to-orange-200/20',
};
const ITEM_META: Record<string, { kcal: string; time: string }> = {
  m1: { kcal: '820', time: '15 min' },
  m2: { kcal: '950', time: '12 min' },
  m3: { kcal: '680', time: '8 min' },
  m4: { kcal: '120', time: '3 min' },
  m5: { kcal: '460', time: '10 min' },
  m6: { kcal: '870', time: '12 min' },
};

export function ItemModal({ item, currencySymbol = 'DH', onClose }: ItemModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedMods, setSelectedMods] = useState<Record<string, SelectedModifier[]>>({});
  const [instructions, setInstructions] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setQuantity(1);
      setSelectedMods({});
      setInstructions('');
      setValidationError(null);
    }
  }, [item]);

  if (!item) return null;

  const gradient = ITEM_GRADIENTS[item.id] ?? 'from-emerald-400/30 to-teal-300/20';
  const icon = ITEM_ICONS[item.id] ?? '🍽️';
  const meta = ITEM_META[item.id];

  const handleToggleModifier = (
    groupName: string,
    minSel: number,
    maxSel: number,
    modifierId: string,
    modifierName: string,
    priceDelta: number,
    groupId: string
  ) => {
    setValidationError(null);
    const cur = selectedMods[groupId] || [];
    const isSelected = cur.some(m => m.modifierId === modifierId);

    if (isSelected) {
      setSelectedMods({ ...selectedMods, [groupId]: cur.filter(m => m.modifierId !== modifierId) });
    } else {
      if (maxSel === 1) {
        setSelectedMods({ ...selectedMods, [groupId]: [{ groupId, groupName, modifierId, modifierName, priceDelta }] });
      } else {
        if (cur.length >= maxSel) {
          setValidationError(`Max ${maxSel} options for "${groupName}"`);
          return;
        }
        setSelectedMods({ ...selectedMods, [groupId]: [...cur, { groupId, groupName, modifierId, modifierName, priceDelta }] });
      }
    }
  };

  const allSelectedMods = Object.values(selectedMods).flat();
  const extraCost = allSelectedMods.reduce((acc, m) => acc + Number(m.priceDelta), 0);
  const unitPrice = Number(item.base_price) + extraCost;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    if (item.modifier_groups) {
      for (const group of item.modifier_groups) {
        const selected = selectedMods[group.id] || [];
        if (group.is_required && selected.length < group.min_selection) {
          setValidationError(`Please select at least ${group.min_selection} option(s) for "${group.name}"`);
          return;
        }
      }
    }
    addItem(item, quantity, allSelectedMods, instructions);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up">

        {/* ── Hero ──────────────────────────────────── */}
        <div className={`relative h-52 sm:h-60 bg-gradient-to-br ${gradient} flex-shrink-0 overflow-hidden`}>
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl animate-float drop-shadow-lg">{icon}</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          {/* Close button */}
          <button
            id="modal-close"
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Badge */}
          {item.badge && (
            <span className="absolute top-3 left-3 text-xs font-bold bg-white/90 text-slate-900 rounded-full px-3 py-1 shadow">
              ✦ {item.badge}
            </span>
          )}
          {/* Meta chips bottom-left */}
          {meta && (
            <div className="absolute bottom-3 left-4 flex gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold bg-black/50 text-white rounded-full px-2.5 py-1 backdrop-blur-md">
                <Flame className="w-3 h-3 text-orange-400" /> {meta.kcal} kcal
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold bg-black/50 text-white rounded-full px-2.5 py-1 backdrop-blur-md">
                <Clock className="w-3 h-3 text-sky-300" /> {meta.time}
              </span>
            </div>
          )}
        </div>

        {/* ── Scrollable Body ────────────────────────── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Title + price */}
          <div className="flex justify-between items-start gap-3">
            <h2 className="text-xl font-black text-slate-900 leading-tight">{item.name}</h2>
            <div className="text-right flex-shrink-0">
              <span className="text-xl font-extrabold text-emerald-600">{Number(item.base_price).toFixed(2)}</span>
              <span className="text-sm text-slate-400 ml-1">{currencySymbol}</span>
            </div>
          </div>
          {item.description && (
            <p className="text-slate-500 text-sm leading-relaxed -mt-2">{item.description}</p>
          )}

          {/* Validation error */}
          {validationError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl animate-scale-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Modifier Groups */}
          {item.modifier_groups?.map(group => {
            const currentSelected = selectedMods[group.id] || [];
            const isRadio = group.max_selection === 1;
            return (
              <div key={group.id} className="border-t border-slate-100 pt-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-emerald-600" />
                      {group.name}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {isRadio ? 'Choose 1 option' : `Select up to ${group.max_selection}`}
                      {currentSelected.length > 0 && <span className="text-emerald-600 font-bold ml-1">· {currentSelected.length} selected</span>}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    group.is_required
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {group.is_required ? 'Required' : 'Optional'}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.modifiers.map(mod => {
                    const isChecked = currentSelected.some(m => m.modifierId === mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => handleToggleModifier(group.name, group.min_selection, group.max_selection, mod.id, mod.name, Number(mod.price_delta), group.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all duration-150 ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50 shadow-sm shadow-emerald-200'
                            : 'border-slate-200 hover:border-emerald-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 ${isRadio ? 'rounded-full' : 'rounded-md'} border-2 flex items-center justify-center transition-all ${
                            isChecked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{mod.name}</span>
                        </div>
                        {Number(mod.price_delta) > 0 && (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                            +{Number(mod.price_delta).toFixed(2)} {currencySymbol}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special Instructions */}
          <div className="border-t border-slate-100 pt-5">
            <label className="block text-sm font-bold text-slate-900 mb-2">Special Instructions</label>
            <textarea
              id="special-instructions"
              rows={2}
              placeholder="e.g. Extra sauce, no onions, well done…"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none resize-none transition"
            />
          </div>
        </div>

        {/* ── Sticky Footer ──────────────────────────── */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
          {/* Qty control */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              id="qty-minus"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-white hover:shadow rounded-lg transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-black text-slate-900">{quantity}</span>
            <button
              id="qty-plus"
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-white hover:shadow rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to cart */}
          <button
            id="add-to-cart-btn"
            onClick={handleAddToCart}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white py-3.5 px-5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-between transition"
          >
            <span>Add to Order</span>
            <span className="font-extrabold">{totalPrice.toFixed(2)} {currencySymbol}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
