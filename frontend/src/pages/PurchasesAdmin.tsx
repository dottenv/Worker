import { useState, useEffect, useCallback } from 'react';
import { useCenters } from '../contexts/CenterContext';
import { api } from '../api/client';
import { useSocketEvent } from '../contexts/SocketContext';
import {
  ShoppingCart, Plus, X, Truck, Package, Building2,
  CheckCircle, XCircle, Clock, Trash2, Pencil, Bot, Search,
  Minus, Plus as PlusIcon, Undo2,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

type Tab = 'catalog' | 'cart' | 'orders' | 'suppliers' | 'returns';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик', ordered: 'Заказано', received: 'Получено', cancelled: 'Отменено',
};
const STATUS_ICONS: Record<string, any> = {
  draft: Clock, ordered: Truck, received: CheckCircle, cancelled: XCircle,
};

interface CartItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  supplier_id: number;
  supplier_name: string;
}

const CART_KEY = 'purchases_cart';

function loadCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch { return []; }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export default function PurchasesAdmin() {
  const { centers, activeCenterId, setActiveCenterId } = useCenters();
  const [tab, setTab] = useState<Tab>('catalog');
  const [cartCount, setCartCount] = useState(0);

  const scId = activeCenterId ?? (centers[0]?.id || 0);

  useEffect(() => {
    const items = loadCart();
    setCartCount(items.reduce((s, i) => s + i.quantity, 0));
  }, [tab]);

  const refreshCart = () => {
    setCartCount(loadCart().reduce((s, i) => s + i.quantity, 0));
  };

  const tabs = [
    { id: 'catalog' as Tab, label: 'Каталог', icon: Package, badge: undefined },
    { id: 'cart' as Tab, label: 'Корзина', icon: ShoppingCart, badge: cartCount || undefined },
    { id: 'orders' as Tab, label: 'Заказы', icon: Truck, badge: undefined },
    { id: 'suppliers' as Tab, label: 'Поставщики', icon: Building2, badge: undefined },
    { id: 'returns' as Tab, label: 'Возврат', icon: Undo2, badge: undefined },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Закупки</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Управление закупками</p>
        </div>
      </div>

      {centers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {centers.map(c => (
            <button key={c.id} onClick={() => setActiveCenterId(c.id)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                scId === c.id ? 'bg-indigo-100 text-indigo-700' : ''
              }`}
              style={scId !== c.id ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' } : {}}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b pb-2 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-t-lg transition-colors relative ${
              tab === t.id ? 'bg-indigo-50 text-indigo-700' : ''
            }`}
            style={tab !== t.id ? { color: 'var(--text-secondary)' } : {}}>
            <t.icon size={16} /> {t.label}
            {t.badge && (
              <span className="ml-1 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {scId === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Выберите склад</div>
      ) : (
        <>
          {tab === 'catalog' && <CatalogTab scId={scId} onCartChange={refreshCart} />}
          {tab === 'cart' && <CartTab scId={scId} onCartChange={refreshCart} />}
          {tab === 'orders' && <OrdersTab scId={scId} />}
          {tab === 'suppliers' && <SuppliersTab scId={scId} />}
          {tab === 'returns' && <ReturnsTab scId={scId} />}
        </>
      )}
    </div>
  );
}

/* ─── Catalog Tab ─── */
function CatalogTab({ scId, onCartChange }: { scId: number; onCartChange: () => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<number | ''>('');

  useEffect(() => {
    Promise.all([
      api.purchases.products.list(scId),
      api.purchases.suppliers.list(scId),
    ]).then(([p, s]) => {
      setProducts(p);
      setSuppliers(s);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [scId]);

  const filtered = products.filter(p => {
    if (filterSupplier && p.supplier_id !== filterSupplier) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const addToCart = (product: any) => {
    const cart = loadCart();
    const existing = cart.find(c => c.product_id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.default_price,
        supplier_id: product.supplier_id,
        supplier_name: product.supplier_name,
      });
    }
    saveCart(cart);
    onCartChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск товаров..." className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
        </div>
        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2.5 rounded-xl text-sm max-w-[180px]"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          <option value="">Все поставщики</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Package size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {search || filterSupplier ? 'Ничего не найдено' : 'Каталог пуст. Запустите парсер поставщика.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <div key={p.id} className="rounded-xl p-4 transition-colors flex flex-col"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                {p.supplier_name && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-disabled)' }}>{p.supplier_name}</p>
                )}
                <p className="text-lg font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                  {p.default_price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </p>
                {p.description && (
                  <p className="text-[10px] mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>
                )}
              </div>
              <button onClick={() => addToCart(p)}
                className="flex items-center justify-center gap-1.5 w-full text-sm font-medium py-2 rounded-xl mt-3 transition-colors"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                <PlusIcon size={14} /> В корзину
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Cart Tab ─── */
function CartTab({ scId, onCartChange }: { scId: number; onCartChange: () => void }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => { setItems(loadCart()); }, []);

  const updateQty = (productId: number, delta: number) => {
    const cart = loadCart();
    const idx = cart.findIndex(c => c.product_id === productId);
    if (idx === -1) return;
    cart[idx].quantity = Math.max(1, cart[idx].quantity + delta);
    saveCart(cart);
    setItems([...cart]);
    onCartChange();
  };

  const removeItem = (productId: number) => {
    const cart = loadCart().filter(c => c.product_id !== productId);
    saveCart(cart);
    setItems(cart);
    onCartChange();
  };

  const clearCart = () => {
    saveCart([]);
    setItems([]);
    onCartChange();
  };

  const checkout = async () => {
    if (items.length === 0) return;
    setOrdering(true);
    try {
      const groups: Record<number, CartItem[]> = {};
      for (const item of items) {
        if (!groups[item.supplier_id]) groups[item.supplier_id] = [];
        groups[item.supplier_id].push(item);
      }

      let created = 0;
      for (const [supplierId, groupItems] of Object.entries(groups)) {
        await api.purchases.orders.create({
          service_center_id: scId,
          supplier_id: Number(supplierId),
          status: 'ordered',
          items: groupItems.map(it => ({
            product_id: it.product_id,
            quantity: it.quantity,
            price_per_unit: it.price,
          })),
        });
        created++;
      }

      saveCart([]);
      setItems([]);
      onCartChange();
      alert(`Заказы оформлены (${created} шт.)`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setOrdering(false);
    }
  };

  const total = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const supplierGroups: Record<number, { name: string; items: CartItem[]; subtotal: number }> = {};
  for (const item of items) {
    if (!supplierGroups[item.supplier_id]) {
      supplierGroups[item.supplier_id] = { name: item.supplier_name, items: [], subtotal: 0 };
    }
    supplierGroups[item.supplier_id].items.push(item);
    supplierGroups[item.supplier_id].subtotal += item.quantity * item.price;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Товаров: {items.length}
        </span>
        {items.length > 0 && (
          <button onClick={clearCart} className="text-xs" style={{ color: 'var(--error)' }}>
            Очистить корзину
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <ShoppingCart size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Корзина пуста</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {Object.entries(supplierGroups).map(([sid, group]) => (
              <div key={sid} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>{group.name}</p>
                {group.items.map(item => (
                  <div key={item.product_id} className="flex items-center gap-2 py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{item.product_name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                        {item.price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product_id, -1)} className="p-1 rounded"
                        style={{ color: 'var(--text-secondary)' }}><Minus size={12} /></button>
                      <span className="text-sm font-medium w-6 text-center" style={{ color: 'var(--text-primary)' }}>{item.quantity}</span>
                      <button onClick={() => updateQty(item.product_id, 1)} className="p-1 rounded"
                        style={{ color: 'var(--text-secondary)' }}><PlusIcon size={12} /></button>
                    </div>
                    <p className="text-sm font-medium w-20 text-right" style={{ color: 'var(--text-primary)' }}>
                      {(item.quantity * item.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                    </p>
                    <button onClick={() => removeItem(item.product_id)} className="p-1" style={{ color: 'var(--error)' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <p className="text-xs font-semibold text-right mt-1.5" style={{ color: 'var(--text-primary)' }}>
                  {group.subtotal.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-base font-bold px-1">
            <span style={{ color: 'var(--text-primary)' }}>Итого:</span>
            <span style={{ color: 'var(--text-primary)' }}>{total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</span>
          </div>

          <button onClick={checkout} disabled={ordering}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            {ordering ? 'Оформление...' : 'Оформить заказы'}
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Orders Tab ─── */
function OrdersTab({ scId }: { scId: number }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try { const r = await api.purchases.orders.list(scId); setOrders(Array.isArray(r) ? r : []); } catch {}
    finally { setLoading(false); }
  }, [scId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useSocketEvent('purchases:updated', () => { fetchOrders(); });

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить заказ?')) return;
    try { await api.purchases.orders.delete(id); api.invalidate('/purchases'); await fetchOrders(); } catch {}
  };

  const [returnModal, setReturnModal] = useState<any>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Всего: {orders.length}</span>
      </div>

      {loading ? <LoadingSpinner /> : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Truck size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Нет заказов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const StatusIcon = STATUS_ICONS[order.status] || Clock;
            return (
              <div key={order.id} className="rounded-xl p-4 transition-colors relative group"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg shrink-0 bg-gray-100 text-gray-600">
                    <StatusIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {order.supplier_name || '—'}
                      </p>
                      <p className="text-sm font-bold shrink-0 ml-2" style={{ color: 'var(--text-primary)' }}>
                        {order.total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </p>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {STATUS_LABELS[order.status] || order.status}
                    </p>
                    {order.items?.map((item: any, i: number) => (
                      <p key={i} className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-disabled)' }}>
                        <Package size={10} />
                        {item.product_name} — {item.quantity} {item.product_unit} × {item.price_per_unit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                        {item.returned_quantity > 0 && <span style={{ color: '#f59e0b' }}>(возврат: {item.returned_quantity})</span>}
                      </p>
                    ))}
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-disabled)' }}>
                      {new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {order.status === 'received' && order.items?.some((it: any) => it.returnable_qty > 0) && (
                      <button onClick={() => setReturnModal(order)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#f59e0b' }}><Undo2 size={14} /></button>
                    )}
                    <button onClick={() => handleDelete(order.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {returnModal && (
        <ReturnModal order={returnModal} onClose={() => setReturnModal(null)} onSaved={() => { setReturnModal(null); fetchOrders(); }} />
      )}
    </div>
  );
}

function ReturnModal({ order, onClose, onSaved }: { order: any; onClose: () => void; onSaved: () => void }) {
  const [returns, setReturns] = useState<Record<number, string>>(() => {
    const r: Record<number, string> = {};
    for (const item of order.items || []) {
      if (item.returnable_qty > 0) r[item.id] = String(item.returnable_qty);
    }
    return r;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = Object.entries(returns)
        .filter(([_, q]) => parseFloat(q) > 0)
        .map(([itemId, q]) => ({ item_id: Number(itemId), quantity: parseFloat(q) }));
      if (items.length === 0) return;
      await api.purchases.orders.returnItems(order.id, items);
      api.invalidate('/purchases');
      onSaved();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Возврат — {order.supplier_name}</h3>
          <button onClick={onClose} className="p-1 rounded-lg"><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>
        <div className="space-y-2">
          {order.items?.filter((it: any) => it.returnable_qty > 0).map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: 'var(--text-primary)' }}>{item.product_name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                  {item.price_per_unit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽ × {item.quantity} {item.product_unit}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Возврат:</span>
                <input type="number" min="0" max={item.returnable_qty} step="1"
                  value={returns[item.id] || ''}
                  onChange={e => setReturns(prev => ({ ...prev, [item.id]: e.target.value }))}
                  className="w-16 px-2 py-1 rounded-lg text-sm text-center"
                  style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>/ {item.returnable_qty}</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center justify-center gap-2 w-full text-sm font-medium py-3 rounded-xl transition-colors"
          style={{ backgroundColor: '#f59e0b', color: 'white' }}>
          {saving ? 'Сохранение...' : 'Оформить возврат'}
        </button>
      </div>
    </div>
  );
}

/* ─── Suppliers Tab (with parser inline) ─── */
function SuppliersTab({ scId }: { scId: number }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setList(await api.purchases.suppliers.list(scId)); } catch {}
    finally { setLoading(false); }
  }, [scId]);

  useEffect(() => { fetch(); }, [fetch]);
  useSocketEvent('purchases:updated', () => fetch());

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить поставщика?')) return;
    try { await api.purchases.suppliers.delete(id); api.invalidate('/purchases'); await fetch(); } catch {}
  };

  const openEdit = (s: any) => { setEditing(s); setShowForm(true); };
  const openAdd = () => { setEditing(null); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Всего: {list.length}</span>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
          <Plus size={16} /> Добавить
        </button>
      </div>

      {loading ? <LoadingSpinner /> : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Building2 size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Нет поставщиков</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(s => (
            <div key={s.id} className="rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                    {s.contact_person && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.contact_person}</p>}
                    {s.phone && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.phone}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="p-1.5 rounded-lg"
                      style={{ color: 'var(--text-secondary)' }}><Pencil size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="p-1.5 rounded-lg"
                      style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>

              {expandedId === s.id && <ParserConfigSection supplierId={s.id} />}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SupplierFormModal scId={scId} supplier={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetch(); }} />
      )}
    </div>
  );
}

/* ─── Parser Config Section (inline in supplier card) ─── */
function ParserConfigSection({ supplierId }: { supplierId: number }) {
  const [config, setConfig] = useState<any | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://novosibirsk.moba.ru');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [logEntries, setLogEntries] = useState<{ time: string; msg: string }[]>([]);

  useEffect(() => {
    api.parser.config.get(supplierId).then(c => {
      if (c) {
        setConfig(c);
        setLogin(c.login || '');
        setBaseUrl(c.base_url || 'https://novosibirsk.moba.ru');
        if (c.sync_status && c.sync_status !== 'idle') fetchStatus(c.id);
      }
    }).catch(() => {});
  }, [supplierId]);

  const saveConfig = async () => {
    if (!login) return;
    setSaving(true);
    try {
      const data: any = { supplier_id: supplierId, login, base_url: baseUrl };
      if (password) data.password = password;
      const c = await api.parser.config.save(data);
      setConfig(c);
      setPassword('');
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const doFetchStatus = (configId: number) => {
    api.invalidate('/purchases/parser/status');
    return api.parser.status(configId).then(s => {
      setStatus(s);
      try { setLogEntries(JSON.parse(s.log || '[]')); } catch { setLogEntries([]); }
      return s;
    }).catch(() => null);
  };

  const fetchStatus = (configId: number) => {
    doFetchStatus(configId).then(s => {
      if (s && (s.status === 'parsing' || s.status === 'placing')) {
        const iv = setInterval(() => {
          doFetchStatus(configId).then(s2 => {
            if (s2 && s2.status !== 'parsing' && s2.status !== 'placing') {
              clearInterval(iv);
              api.invalidate('/purchases');
            }
          });
        }, 2000);
      }
    });
  };

  const runParse = async () => {
    if (!config) return;
    try {
      await api.parser.run(config.id, 'parse_catalog');
      fetchStatus(config.id);
    } catch (err: any) { alert(err.message); }
  };

  const resetParser = async () => {
    if (!config) return;
    try {
      await api.parser.reset(config.id);
      setStatus(null);
      setLogEntries([]);
    } catch (err: any) { alert(err.message); }
  };

  const sc = (s: string) => {
    switch (s) {
      case 'parsing': case 'placing': return '#3b82f6';
      case 'done': return '#10b981'; case 'error': return '#ef4444';
      default: return 'var(--text-secondary)';
    }
  };
  const sl = (s: string) => {
    switch (s) {
      case 'parsing': return 'Парсинг...'; case 'placing': return 'Оформление...';
      case 'done': return 'Завершено'; case 'error': return 'Ошибка';
      default: return 'Ожидание';
    }
  };

  return (
    <div className="px-4 pb-4 space-y-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
      <div className="space-y-2">
        <input value={login} onChange={e => setLogin(e.target.value)} placeholder="Логин (email)"
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder={config ? 'Новый пароль' : 'Пароль'}
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
        <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="URL"
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
        <div className="flex gap-2">
          <button onClick={saveConfig} disabled={saving || !login}
            className="flex-1 text-sm font-medium py-2 rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            {saving ? '...' : 'Сохранить'}
          </button>
          {config && (
            <button onClick={runParse} disabled={status?.status === 'parsing' || status?.status === 'placing'}
              className="flex items-center justify-center gap-1.5 px-4 text-sm font-medium py-2 rounded-xl transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#6366f1', color: 'white' }}>
              <Bot size={14} /> Парсить
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium" style={{ color: sc(status.status) }}>{sl(status.status)}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{status.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${status.progress}%`, backgroundColor: sc(status.status) }} />
          </div>
          {logEntries.length > 0 && (
            <div className="max-h-28 overflow-y-auto space-y-0.5">
              {logEntries.map((e, i) => (
                <p key={i} className="text-[9px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(e.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {e.msg}
                </p>
              ))}
            </div>
          )}
          {status.status === 'error' && (
            <button onClick={resetParser} className="text-[10px] font-medium mt-1" style={{ color: '#ef4444' }}>
              Сбросить статус
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Returns Tab ─── */
function ReturnsTab({ scId }: { scId: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.purchases.returns.list(scId)); } catch {}
    finally { setLoading(false); }
  }, [scId]);

  useEffect(() => { fetch(); }, [fetch]);
  useSocketEvent('purchases:updated', () => fetch());

  return (
    <div className="space-y-4">
      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Всего возвратов: {items.length}</span>
      {loading ? <LoadingSpinner /> : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Undo2 size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Нет возвратов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                  <Undo2 size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.product_name || '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {item.supplier_name} — возвращено {item.returned_quantity} {item.product_unit}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                    {new Date(item.order_created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>
                  {(item.returned_quantity * item.price_per_unit).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Supplier Form Modal ─── */
function SupplierFormModal({ scId, supplier, onClose, onSaved }: {
  scId: number; supplier: any | null; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(supplier?.name || '');
  const [contact, setContact] = useState(supplier?.contact_person || '');
  const [phone, setPhone] = useState(supplier?.phone || '');
  const [email, setEmail] = useState(supplier?.email || '');
  const [address, setAddress] = useState(supplier?.address || '');
  const [notes, setNotes] = useState(supplier?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      const data = { service_center_id: scId, name, contact_person: contact, phone, email, address, notes };
      if (supplier) { await api.purchases.suppliers.update(supplier.id, data); }
      else { await api.purchases.suppliers.create(data); }
      api.invalidate('/purchases');
      onSaved();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{supplier ? 'Редактировать' : 'Новый поставщик'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg"><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название *" required
            className="w-full px-3.5 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Контактное лицо"
            className="w-full px-3.5 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Телефон"
            className="w-full px-3.5 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full px-3.5 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Адрес"
            className="w-full px-3.5 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Примечание" rows={2}
            className="w-full px-3.5 py-3 rounded-xl text-sm resize-none"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <button type="submit" disabled={saving}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium py-3 rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            {saving ? 'Сохранение...' : (supplier ? 'Сохранить' : 'Добавить')}
          </button>
        </form>
      </div>
    </div>
  );
}
