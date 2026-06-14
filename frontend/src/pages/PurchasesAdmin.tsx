import { useState, useEffect, useCallback } from 'react';
import { useCenters } from '../contexts/CenterContext';
import { api } from '../api/client';
import { useSocketEvent } from '../contexts/SocketContext';
import {
  ShoppingCart, Plus, X, Truck, Package, Building2,
  CheckCircle, XCircle, Clock, Trash2, Pencil, Bot,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

type Tab = 'orders' | 'suppliers' | 'products' | 'parser';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик', ordered: 'Заказано', received: 'Получено', cancelled: 'Отменено',
};
const STATUS_ICONS: Record<string, any> = {
  draft: Clock, ordered: Truck, received: CheckCircle, cancelled: XCircle,
};

export default function PurchasesAdmin() {
  const { centers, activeCenterId, setActiveCenterId } = useCenters();
  const [tab, setTab] = useState<Tab>('orders');

  const scId = activeCenterId ?? (centers[0]?.id || 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Закупки (админ)</h1>
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
        {([
          { id: 'orders', label: 'Заказы', icon: ShoppingCart },
          { id: 'suppliers', label: 'Поставщики', icon: Building2 },
          { id: 'products', label: 'Товары', icon: Package },
          { id: 'parser', label: 'Парсер', icon: Bot },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-t-lg transition-colors ${
              tab === t.id ? 'bg-indigo-50 text-indigo-700' : ''
            }`}
            style={tab !== t.id ? { color: 'var(--text-secondary)' } : {}}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {scId === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Выберите склад</div>
      ) : (
        <>
          {tab === 'orders' && <OrdersTab scId={scId} />}
          {tab === 'suppliers' && <SuppliersTab scId={scId} />}
          {tab === 'products' && <ProductsTab scId={scId} />}
          {tab === 'parser' && <ParserTab scId={scId} />}
        </>
      )}
    </div>
  );
}

/* ─── Orders Tab ─── */
function OrdersTab({ scId }: { scId: number }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.purchases.orders.list(scId);
      setOrders(Array.isArray(res) ? res : []);
    } catch {}
    finally { setLoading(false); }
  }, [scId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useSocketEvent('purchases:updated', () => { fetchOrders(); });

  const openAdd = async () => {
    try {
      const [s, p] = await Promise.all([
        api.purchases.suppliers.list(scId),
        api.purchases.products.list(scId),
      ]);
      setSuppliers(s);
      setProducts(p);
      setShowAdd(true);
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить заказ?')) return;
    try {
      await api.purchases.orders.delete(id);
      api.invalidate('/purchases');
      await fetchOrders();
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Всего: {orders.length}
        </span>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
          <Plus size={16} /> Создать заказ
        </button>
      </div>

      {loading ? <LoadingSpinner /> : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <ShoppingCart size={40} style={{ color: 'var(--text-disabled)' }} />
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
                      </p>
                    ))}
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-disabled)' }}>
                      {new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(order.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    style={{ color: 'var(--error)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <OrderFormModal
          scId={scId}
          suppliers={suppliers}
          products={products}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchOrders(); }}
        />
      )}
    </div>
  );
}

/* ─── Order Form Modal ─── */
function OrderFormModal({ scId, suppliers, products, onClose, onSaved }: {
  scId: number; suppliers: any[]; products: any[];
  onClose: () => void; onSaved: () => void;
}) {
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [status, setStatus] = useState('draft');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ product_id: number | ''; quantity: string; price_per_unit: string }[]>([
    { product_id: '', quantity: '1', price_per_unit: '0' },
  ]);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems(prev => [...prev, { product_id: '', quantity: '1', price_per_unit: '0' }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: string, val: any) =>
    setItems(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: val } : d));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return;
    setSaving(true);
    try {
      await api.purchases.orders.create({
        service_center_id: scId,
        supplier_id: Number(supplierId),
        status,
        notes,
        items: items
          .filter(it => it.product_id && it.quantity)
          .map(it => ({
            product_id: Number(it.product_id),
            quantity: it.quantity,
            price_per_unit: it.price_per_unit || 0,
          })),
      });
      api.invalidate('/purchases');
      onSaved();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const total = items.reduce((s, it) => {
    const q = parseFloat(it.quantity) || 0;
    const p = parseFloat(it.price_per_unit) || 0;
    return s + q * p;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Новый заказ</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <select value={supplierId} onChange={e => setSupplierId(Number(e.target.value))} required
            className="w-full px-3.5 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            <option value="">Выберите поставщика</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              <Package size={12} className="inline mr-1" /> Товары
            </label>
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-1.5 mb-1.5">
                <select value={it.product_id} onChange={e => updateItem(i, 'product_id', Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  <option value="">Товар</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
                <input type="number" step="0.01" value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)}
                  placeholder="Кол-во" className="w-20 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                <input type="number" step="0.01" value={it.price_per_unit} onChange={e => updateItem(i, 'price_per_unit', e.target.value)}
                  placeholder="Цена" className="w-24 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="p-1.5 rounded-lg" style={{ color: 'var(--error)' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-xs font-medium flex items-center gap-1 py-1.5" style={{ color: 'var(--accent)' }}>
              + Добавить товар
            </button>
          </div>

          <div className="flex items-center justify-between text-sm font-bold px-1">
            <span style={{ color: 'var(--text-primary)' }}>Итого:</span>
            <span style={{ color: 'var(--text-primary)' }}>{total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</span>
          </div>

          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Примечание (необязательно)" rows={2}
            className="w-full px-3.5 py-3 rounded-xl text-sm resize-none"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />

          <button type="submit" disabled={saving}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium py-3 rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            {saving ? 'Сохранение...' : 'Создать заказ'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Suppliers Tab ─── */
function SuppliersTab({ scId }: { scId: number }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setList(await api.purchases.suppliers.list(scId)); } catch {}
    finally { setLoading(false); }
  }, [scId]);

  useEffect(() => { fetch(); }, [fetch]);
  useSocketEvent('purchases:updated', () => fetch());

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить поставщика?')) return;
    try {
      await api.purchases.suppliers.delete(id);
      api.invalidate('/purchases');
      await fetch();
    } catch {}
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
            <div key={s.id} className="rounded-xl p-4 transition-colors relative group"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                  {s.contact_person && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.contact_person}</p>}
                  {s.phone && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.phone}</p>}
                  {s.email && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.email}</p>}
                  {s.address && <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>{s.address}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                </div>
              </div>
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
      if (supplier) {
        await api.purchases.suppliers.update(supplier.id, data);
      } else {
        await api.purchases.suppliers.create(data);
      }
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
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{supplier ? 'Редактировать' : 'Новый поставщик'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg"><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название *" required
            className="w-full px-3.5 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Контактное лицо"
            className="w-full px-3.5 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Телефон"
            className="w-full px-3.5 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full px-3.5 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Адрес"
            className="w-full px-3.5 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
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

/* ─── Products Tab ─── */
function ProductsTab({ scId }: { scId: number }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setList(await api.purchases.products.list(scId)); } catch {}
    finally { setLoading(false); }
  }, [scId]);

  useEffect(() => { fetch(); }, [fetch]);
  useSocketEvent('purchases:updated', () => fetch());

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    try {
      await api.purchases.products.delete(id);
      api.invalidate('/purchases');
      await fetch();
    } catch {}
  };

  const openEdit = (p: any) => { setEditing(p); setShowForm(true); };
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
          <Package size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Нет товаров</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(p => (
            <div key={p.id} className="rounded-xl p-4 transition-colors relative group"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <Package size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {p.default_price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽/{p.unit}
                    </p>
                  </div>
                  {p.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ProductFormModal scId={scId} product={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetch(); }} />
      )}
    </div>
  );
}

function ProductFormModal({ scId, product, onClose, onSaved }: {
  scId: number; product: any | null; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [unit, setUnit] = useState(product?.unit || 'шт');
  const [price, setPrice] = useState(product?.default_price?.toString() || '');
  const [desc, setDesc] = useState(product?.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      const data = { service_center_id: scId, name, unit, default_price: price || 0, description: desc };
      if (product) {
        await api.purchases.products.update(product.id, data);
      } else {
        await api.purchases.products.create(data);
      }
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
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{product ? 'Редактировать' : 'Новый товар'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg"><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название *" required
            className="w-full px-3.5 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <div className="flex gap-2">
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Ед. изм."
              className="w-24 px-3.5 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Цена по умолчанию"
              className="flex-1 px-3.5 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          </div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание" rows={2}
            className="w-full px-3.5 py-3 rounded-xl text-sm resize-none"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <button type="submit" disabled={saving}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium py-3 rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            {saving ? 'Сохранение...' : (product ? 'Сохранить' : 'Добавить')}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Parser Tab ─── */
function ParserTab({ scId }: { scId: number }) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [config, setConfig] = useState<any | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://novosibirsk.moba.ru');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ status: string; progress: number; log: string; last_sync_at: string | null } | null>(null);
  const [statusInterval, setStatusInterval] = useState<any>(null);
  const [logEntries, setLogEntries] = useState<{ time: string; msg: string }[]>([]);

  useEffect(() => {
    api.purchases.suppliers.list(scId).then(setSuppliers).catch(() => {});
  }, [scId]);

  const selectSupplier = async (sid: number | '') => {
    setSelectedSupplierId(sid);
    setConfig(null);
    setLogin('');
    setPassword('');
    setBaseUrl('https://novosibirsk.moba.ru');
    setStatus(null);
    setLogEntries([]);
    if (statusInterval) clearInterval(statusInterval);
    if (!sid) return;
    try {
      const c = await api.parser.config.get(Number(sid));
      if (c) {
        setConfig(c);
        setLogin(c.login || '');
        setPassword('');
        setBaseUrl(c.base_url || 'https://novosibirsk.moba.ru');
        if (c.sync_status && c.sync_status !== 'idle') {
          fetchStatus(c.id);
        }
      }
    } catch {}
  };

  const saveConfig = async () => {
    if (!selectedSupplierId || !login) return;
    setSaving(true);
    try {
      const data: any = {
        supplier_id: Number(selectedSupplierId),
        login,
        base_url: baseUrl,
      };
      if (password) data.password = password;
      const c = await api.parser.config.save(data);
      setConfig(c);
      setPassword('');
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const fetchStatus = (configId: number) => {
    api.parser.status(configId).then(s => {
      setStatus(s);
      try { setLogEntries(JSON.parse(s.log || '[]')); } catch { setLogEntries([]); }
      if (s.status === 'parsing' || s.status === 'placing') {
        const iv = setInterval(() => {
          api.parser.status(configId).then(s2 => {
            setStatus(s2);
            try { setLogEntries(JSON.parse(s2.log || '[]')); } catch {}
            if (s2.status !== 'parsing' && s2.status !== 'placing') {
              clearInterval(iv);
              setStatusInterval(null);
              api.invalidate('/purchases');
            }
          }).catch(() => {});
        }, 2000);
        setStatusInterval(iv);
      }
    }).catch(() => {});
  };

  const runParse = async () => {
    if (!config) return;
    try {
      await api.parser.run(config.id, 'parse_catalog');
      fetchStatus(config.id);
    } catch (err: any) { alert(err.message); }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'idle': return 'var(--text-secondary)';
      case 'parsing': case 'placing': return '#3b82f6';
      case 'done': return '#10b981';
      case 'error': return '#ef4444';
      default: return 'var(--text-secondary)';
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'idle': return 'Ожидание';
      case 'parsing': return 'Парсинг каталога...';
      case 'placing': return 'Оформление заказа...';
      case 'done': return 'Завершено';
      case 'error': return 'Ошибка';
      default: return s;
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Парсер поставщика</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Автоматический парсинг каталога и оформление заказов через аккаунт поставщика
        </p>
      </div>

      <div>
        <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Поставщик</label>
        <select value={selectedSupplierId} onChange={e => selectSupplier(e.target.value ? Number(e.target.value) : '')}
          className="w-full px-3.5 py-3 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          <option value="">Выберите поставщика</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {selectedSupplierId && (
        <>
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <h4 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Подключение к MOBA.RU</h4>
            <input value={login} onChange={e => setLogin(e.target.value)} placeholder="Логин (email)"
              className="w-full px-3.5 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={config ? 'Новый пароль (оставьте пустым если не меняется)' : 'Пароль'}
              className="w-full px-3.5 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="Базовый URL"
              className="w-full px-3.5 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <button onClick={saveConfig} disabled={saving || !login}
              className="flex items-center justify-center gap-1.5 w-full text-sm font-medium py-2.5 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>

          {config && (
            <div className="space-y-3">
              <button onClick={runParse} disabled={status?.status === 'parsing' || status?.status === 'placing'}
                className="flex items-center justify-center gap-2 w-full text-sm font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#6366f1', color: 'white' }}>
                <Bot size={18} />
                {status?.status === 'parsing' ? 'Парсинг...' : status?.status === 'placing' ? 'Оформление...' : 'Парсить каталог'}
              </button>

              {status && (
                <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: statusColor(status.status) }}>
                      {statusLabel(status.status)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{status.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${status.progress}%`, backgroundColor: statusColor(status.status) }} />
                  </div>
                  {logEntries.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
                      {logEntries.map((e, i) => (
                        <p key={i} className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(e.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} — {e.msg}
                        </p>
                      ))}
                    </div>
                  )}
                  {status.last_sync_at && (
                    <p className="text-[10px] pt-1" style={{ color: 'var(--text-disabled)' }}>
                      Последняя синхр.: {new Date(status.last_sync_at).toLocaleString('ru-RU')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
