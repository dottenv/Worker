import { useState, useEffect, useCallback } from 'react';
import { useCenters } from '../contexts/CenterContext';
import { api } from '../api/client';
import { useSocketEvent } from '../contexts/SocketContext';
import {
  ShoppingCart, Package, Truck, CheckCircle, XCircle, Clock,
  Search, Minus, Plus as PlusIcon, X, Undo2,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

type Tab = 'catalog' | 'cart' | 'orders' | 'returns';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик', ordered: 'Заказано', received: 'Получено', cancelled: 'Отменено',
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'text-gray-500 bg-gray-100', ordered: 'text-blue-600 bg-blue-50',
  received: 'text-emerald-600 bg-emerald-50', cancelled: 'text-red-600 bg-red-50',
};
const STATUS_ICONS: Record<string, any> = {
  draft: Clock, ordered: Truck, received: CheckCircle, cancelled: XCircle,
};

interface CartItem {
  product_id: number; product_name: string; quantity: number;
  price: number; supplier_id: number; supplier_name: string;
}
const CART_KEY = 'purchases_cart';
function loadCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
}
function saveCart(items: CartItem[]) { localStorage.setItem(CART_KEY, JSON.stringify(items)); }

export default function Purchases() {
  const { centers, activeCenterId } = useCenters();
  const [tab, setTab] = useState<Tab>('catalog');
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = () => setCartCount(loadCart().reduce((s, i) => s + i.quantity, 0));
  useEffect(() => { refreshCart(); }, [tab]);

  const tabs = [
    { id: 'catalog' as Tab, label: 'Каталог', icon: Package, badge: undefined },
    { id: 'cart' as Tab, label: 'Корзина', icon: ShoppingCart, badge: cartCount || undefined },
    { id: 'orders' as Tab, label: 'Заказы', icon: Truck, badge: undefined },
    { id: 'returns' as Tab, label: 'Возврат', icon: Undo2, badge: undefined },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Закупки</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Каталог и заказы поставщикам</p>
      </div>

      {centers.length > 1 && activeCenterId && (
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {centers.find(c => c.id === activeCenterId)?.name || ''}
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

      <>
        {tab === 'catalog' && <CatalogTab scId={activeCenterId ?? 0} onCartChange={refreshCart} />}
        {tab === 'cart' && <CartTab scId={activeCenterId ?? 0} onCartChange={refreshCart} />}
        {tab === 'orders' && <OrdersTab scId={activeCenterId ?? undefined} />}
        {tab === 'returns' && <ReturnsTab scId={activeCenterId ?? undefined} />}
      </>
    </div>
  );
}

/* ─── Catalog Tab ─── */
function CatalogTab({ scId, onCartChange }: { scId: number; onCartChange: () => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.purchases.products.list(scId).then(setProducts).catch(() => {}).finally(() => setLoading(false));
  }, [scId]);

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const addToCart = (product: any) => {
    const cart = loadCart();
    const existing = cart.find(c => c.product_id === product.id);
    if (existing) { existing.quantity += 1; }
    else {
      cart.push({
        product_id: product.id, product_name: product.name, quantity: 1,
        price: product.default_price, supplier_id: product.supplier_id, supplier_name: product.supplier_name,
      });
    }
    saveCart(cart);
    onCartChange();
  };

  return (
    <div className="space-y-4">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск товаров..." className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Package size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Каталог пуст</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <div key={p.id} className="rounded-xl p-4 flex flex-col"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                {p.supplier_name && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-disabled)' }}>{p.supplier_name}</p>}
                <p className="text-lg font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                  {p.default_price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </p>
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
    saveCart(cart); setItems([...cart]); onCartChange();
  };
  const removeItem = (productId: number) => {
    const cart = loadCart().filter(c => c.product_id !== productId);
    saveCart(cart); setItems(cart); onCartChange();
  };
  const clearCart = () => { saveCart([]); setItems([]); onCartChange(); };

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
          service_center_id: scId, supplier_id: Number(supplierId), status: 'ordered',
          items: groupItems.map(it => ({ product_id: it.product_id, quantity: it.quantity, price_per_unit: it.price })),
        });
        created++;
      }
      saveCart([]); setItems([]); onCartChange();
      alert(`Заказы оформлены (${created} шт.)`);
    } catch (err: any) { alert(err.message); }
    finally { setOrdering(false); }
  };

  const total = items.reduce((s, i) => s + i.quantity * i.price, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Товаров: {items.length}</span>
        {items.length > 0 && <button onClick={clearCart} className="text-xs" style={{ color: 'var(--error)' }}>Очистить</button>}
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <ShoppingCart size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Корзина пуста</p>
        </div>
      ) : (
        <>
          {items.map(item => (
            <div key={item.product_id} className="flex items-center gap-2 rounded-xl p-3"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{item.product_name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{item.supplier_name}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.product_id, -1)} className="p-1"><Minus size={12} style={{ color: 'var(--text-secondary)' }} /></button>
                <span className="text-sm font-medium w-6 text-center" style={{ color: 'var(--text-primary)' }}>{item.quantity}</span>
                <button onClick={() => updateQty(item.product_id, 1)} className="p-1"><PlusIcon size={12} style={{ color: 'var(--text-secondary)' }} /></button>
              </div>
              <p className="text-sm font-medium w-20 text-right" style={{ color: 'var(--text-primary)' }}>
                {(item.quantity * item.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </p>
              <button onClick={() => removeItem(item.product_id)} style={{ color: 'var(--error)' }}><X size={14} /></button>
            </div>
          ))}
          <div className="flex items-center justify-between text-base font-bold">
            <span style={{ color: 'var(--text-primary)' }}>Итого:</span>
            <span style={{ color: 'var(--text-primary)' }}>{total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</span>
          </div>
          <button onClick={checkout} disabled={ordering}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium py-3 rounded-xl disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            {ordering ? 'Оформление...' : 'Оформить заказы'}
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Orders Tab ─── */
function OrdersTab({ scId }: { scId: number | undefined }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.purchases.orders.list(scId); setOrders(Array.isArray(r) ? r : []); } catch {}
    finally { setLoading(false); }
  }, [scId]);

  useEffect(() => { fetch(); }, [fetch]);
  useSocketEvent('purchases:updated', () => fetch());

  return (
    <div className="space-y-2">
      {loading ? <LoadingSpinner /> : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <ShoppingCart size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Нет заказов</p>
        </div>
      ) : orders.map(order => {
        const StatusIcon = STATUS_ICONS[order.status] || Clock;
        const sc = STATUS_COLORS[order.status] || 'text-gray-500 bg-gray-50';
        return (
          <div key={order.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${sc}`}><StatusIcon size={18} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{order.supplier_name || '—'}</p>
                  <p className="text-sm font-bold shrink-0 ml-2" style={{ color: 'var(--text-primary)' }}>
                    {order.total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                  </p>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{STATUS_LABELS[order.status] || order.status}</p>
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
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Returns Tab ─── */
function ReturnsTab({ scId }: { scId: number | undefined }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!scId) return;
    setLoading(true);
    try { setItems(await api.purchases.returns.list(scId)); } catch {}
    finally { setLoading(false); }
  }, [scId]);

  useEffect(() => { fetch(); }, [fetch]);
  useSocketEvent('purchases:updated', () => fetch());

  return (
    <div className="space-y-2">
      {loading ? <LoadingSpinner /> : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Undo2 size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Нет возвратов</p>
        </div>
      ) : items.map((item: any) => (
        <div key={item.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0"><Undo2 size={18} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.product_name || '—'}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {item.supplier_name} — возвращено {item.returned_quantity} {item.product_unit}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{new Date(item.order_created_at).toLocaleDateString('ru-RU')}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
