"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { Restaurant, Category, MenuItem } from "@/types";
import { Store, Plus, Loader2, Save, Trash2, AlertTriangle, LogOut, Wand2, UploadCloud } from "lucide-react";
import Link from "next/link";

export default function AdminMenuPage({ params }: { params: { restaurantId: string } }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Magic Import
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Category State
  const [newCatName, setNewCatName] = useState("");

  // New Item State
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    base_price: "0",
    category_id: "",
    image_url: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: rData } = await supabase.from("restaurants").select("*").eq("id", params.restaurantId).single();
    if (rData) setRestaurant(rData);

    const { data: cData } = await supabase.from("categories").select("*").eq("restaurant_id", params.restaurantId).order("display_order");
    if (cData) setCategories(cData);

    const { data: iData } = await supabase.from("menu_items").select("*").eq("restaurant_id", params.restaurantId).order("name");
    if (iData) setItems(iData);

    setLoading(false);
  };

  useEffect(() => {
    // Auth guard — must have logged in via PIN
    const isAuthed = sessionStorage.getItem(`auth_${params.restaurantId}`);
    if (!isAuthed) {
      router.replace(`/login/${params.restaurantId}`);
      return;
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.restaurantId]);

  const handleSignOut = () => {
    sessionStorage.removeItem(`auth_${params.restaurantId}`);
    sessionStorage.removeItem("active_restaurant_id");
    router.push(`/login/${params.restaurantId}`);
  };

  const handleMagicImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      // 1. Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      
      const [mimePrefix, base64] = base64Data.split(',');
      const mimeType = mimePrefix.match(/:(.*?);/)?.[1] || 'image/jpeg';

      // 2. Call Gemini extraction API
      const res = await fetch('/api/extract-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.error);
      
      // 3. Insert into Supabase
      let maxOrder = categories.reduce((max, c) => Math.max(max, c.display_order), 0);
      
      for (const cat of data.data.categories) {
        maxOrder++;
        const catId = uuidv4();
        await supabase.from("categories").insert({
          id: catId,
          restaurant_id: params.restaurantId,
          name: cat.name,
          display_order: maxOrder,
          is_active: true,
        });

        if (cat.items && cat.items.length > 0) {
          const itemsToInsert = cat.items.map((item: any) => ({
            id: uuidv4(),
            restaurant_id: params.restaurantId,
            category_id: catId,
            name: item.name,
            description: item.description || null,
            base_price: parseFloat(item.price) || 0,
            is_available: true,
          }));
          await supabase.from("menu_items").insert(itemsToInsert);
        }
      }

      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to import menu: " + err.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const id = uuidv4();
    const { error } = await supabase.from("categories").insert({
      id,
      restaurant_id: params.restaurantId,
      name: newCatName,
      display_order: categories.length + 1,
      is_active: true,
    });

    if (!error) {
      setNewCatName("");
      fetchData();
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.category_id) return;

    const id = uuidv4();
    const { error } = await supabase.from("menu_items").insert({
      id,
      restaurant_id: params.restaurantId,
      category_id: newItem.category_id,
      name: newItem.name,
      description: newItem.description,
      base_price: parseFloat(newItem.base_price) || 0,
      image_url: newItem.image_url || null,
      is_available: true,
    });

    if (!error) {
      setShowItemForm(false);
      setNewItem({ name: "", description: "", base_price: "0", category_id: "", image_url: "" });
      fetchData();
    }
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("menu_items").delete().eq("id", id);
    fetchData();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  }

  if (!restaurant) {
    return <div className="p-8">Restaurant not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-[Outfit]">
      <header className="bg-white border-b border-slate-100 px-6 h-16 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-indigo-600" />
          <h1 className="font-black text-xl text-slate-900">{restaurant.name} - Menu Admin</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/${restaurant.slug}`} className="text-sm font-bold text-indigo-600 hover:underline">
            View Live Menu
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-10">
        {!restaurant.is_active && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-3xl shadow-sm flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-amber-800 font-black text-lg mb-1">Your restaurant is pending approval</h3>
              <p className="text-amber-700 text-sm font-medium">
                You can build your menu now, but your restaurant will not appear on the DelivriLi marketplace until our team reviews and approves it.
              </p>
            </div>
          </div>
        )}

        {/* Categories Section */}
        <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6">Menu Categories</h2>
          
          <div className="flex flex-wrap gap-3 mb-6">
            {categories.map(c => (
              <div key={c.id} className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-700">
                {c.name}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCategory} className="flex gap-3 max-w-md">
            <input
              type="text"
              required
              placeholder="New Category Name"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-indigo-600 font-medium"
            />
            <button type="submit" className="bg-indigo-600 text-white px-5 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>
        </section>

        {/* Menu Items Section */}
        <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          {/* Overlay when importing */}
          {isImporting && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-3xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                <Wand2 className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-indigo-900 mb-2">AI is reading your menu...</h3>
              <p className="text-indigo-600/70 text-sm font-medium">This usually takes about 5 to 10 seconds.</p>
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mt-6" />
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900">Menu Items</h2>
            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleMagicImport} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isImporting}
                className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors text-sm"
              >
                <Wand2 className="w-4 h-4" /> Magic Import
              </button>

              {!showItemForm && categories.length > 0 && (
                <button onClick={() => setShowItemForm(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors text-sm">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              )}
            </div>
          </div>

          {categories.length === 0 && (
            <p className="text-slate-500 text-sm italic mb-6">Please add a category first before adding items.</p>
          )}

          {/* Add Item Form */}
          {showItemForm && (
            <form onSubmit={handleAddItem} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Item Name *</label>
                  <input type="text" required value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Category *</label>
                  <select required value={newItem.category_id} onChange={(e) => setNewItem({...newItem, category_id: e.target.value})} className="w-full px-3 py-2 border rounded-xl">
                    <option value="">Select a category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Price (DH) *</label>
                  <input type="number" step="0.01" required value={newItem.base_price} onChange={(e) => setNewItem({...newItem, base_price: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Image URL</label>
                  <input type="url" value={newItem.image_url} onChange={(e) => setNewItem({...newItem, image_url: e.target.value})} className="w-full px-3 py-2 border rounded-xl" placeholder="https://..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                  <textarea value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} className="w-full px-3 py-2 border rounded-xl" rows={2}></textarea>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowItemForm(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700">
                  <Save className="w-4 h-4" /> Save Item
                </button>
              </div>
            </form>
          )}

          {/* Items List */}
          <div className="space-y-6">
            {categories.map(cat => {
              const catItems = items.filter(i => i.category_id === cat.id);
              if (catItems.length === 0) return null;
              
              return (
                <div key={cat.id}>
                  <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">{cat.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catItems.map(item => (
                      <div key={item.id} className="flex gap-4 border border-slate-100 p-4 rounded-2xl bg-white shadow-sm group">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-slate-100" />
                        ) : (
                          <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center text-2xl border border-slate-100">🍽️</div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className="font-bold text-slate-900">{item.name}</h4>
                            <button onClick={() => handleDeleteItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-2">{item.description}</p>
                          <span className="font-black text-indigo-600 text-sm">{item.base_price.toFixed(2)} DH</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
