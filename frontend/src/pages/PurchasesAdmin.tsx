import { useState, useEffect, useCallback, useRef } from 'react';
import { useCenters } from '../contexts/CenterContext';
import { api } from '../api/client';
import { useSocketEvent } from '../contexts/SocketContext';
import {
  Package, Plus, X, Truck, Building2,
  CheckCircle, XCircle, Clock, Trash2, Pencil, Search,
  Minus, Undo2, ScanLine, Boxes, ArrowDownToLine, History, Barcode,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import BarcodeScanner from '../components/BarcodeScanner';

type Tab = 'products' | 'stock' | 'orders' | 'suppliers' | 'returns' | 'movements';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик', ordered: 'Заказано', received: 'Получено', cancelled: 'Отменено',
};
const STATUS_ICONS: Record<string, any> = {
  draft: Clock, ordered: Truck, received: CheckCircle, cancelled: XCircle,
};

interface Product { id: number; name: string; sku: string; barcode: string; unit: string; default_price: number; stock_quantity: number; min_quantity: number; location: string; supplier_id: number | null; supplier_name: string | null; low_stock?: boolean; }
interface Supplier { id: number; name: string; contact_person: string; phone: string; email: string; address: string; }
interface OrderItem { id: number; product_id: number; quantity: number; price_per_unit: number; returned_quantity: number; product_name?: string; }
interface Order { id: number; supplier_id: number; supplier_name?: string; status: string; notes: string; created_at: string; items: OrderItem[]; total?: number; }
interface Movement { id: number; product_id: number; product_name: string; type: string; type_label: string; quantity: number; reason: string; user_name: string; created_at: string; }

export default function PurchasesAdmin() {
  const { centers, activeCenterId, setActiveCenterId } = useCenters();
  const [tab, setTab] = useState<Tab>('products');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const scId = activeCenterId ?? (centers[0]?.id || 0);

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');

  // modals
  const [productModal, setProductModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [supplierModal, setSupplierModal] = useState<{ open: boolean; supplier: Supplier | null }>({ open: false, supplier: null });
  const [orderModal, setOrderModal] = useState(false);
  const [writeoffModal, setWriteoffModal] = useState<{ open: boolean; prefill?: number }>({ open: false });
  const [writeoffScan, setWriteoffScan] = useState<number | null>(null);
  const [returnModal, setReturnModal] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });
  const [scanner, setScanner] = useState<{ open: boolean; target: 'product' | 'writeoff' }>({ open: false, target: 'product' });

  const flash = (type: 'error' | 'success', text: string) => {
    setMessage({ type, text });
    if (type === 'success') setTimeout(() => setMessage(null), 3000);
  };

  const loadProducts = useCallback(async () => {
    if (!scId) return;
    try { setProducts(await api.purchases.products.list(scId)); } catch (e: any) { flash('error', e?.message || 'Ошибка загрузки товаров'); }
  }, [scId]);

  const loadSuppliers = useCallback(async () => {
    if (!scId) return;
    try { setSuppliers(await api.purchases.suppliers.list(scId)); } catch (e: any) { flash('error', e?.message || 'Ошибка загрузки поставщиков'); }
  }, [scId]);

  const loadOrders = useCallback(async () => {
    if (!scId) return;
    try { setOrders(await api.purchases.orders.list(scId)); } catch (e: any) { flash('error', e?.message || 'Ошибка загрузки заказов'); }
  }, [scId]);

  const loadStock = useCallback(async () => {
    if (!scId) return;
    try { setStock(await api.purchases.stock.list(scId)); } catch (e: any) { flash('error', e?.message || 'Ошибка загрузки остатков'); }
  }, [scId]);

  const loadMovements = useCallback(async () => {
    if (!scId) return;
    try { setMovements(await api.purchases.stock.movements(scId)); } catch (e: any) { flash('error', e?.message || 'Ошибка загрузки движений'); }
  }, [scId]);

  const reload = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadProducts(), loadSuppliers(), loadOrders(), loadStock(), loadMovements()]);
    setLoading(false);
  }, [loadProducts, loadSuppliers, loadOrders, loadStock, loadMovements]);

  useEffect(() => { reload(); }, [reload]);

  useSocketEvent('purchases:updated', () => { reload(); });

  const filteredProducts = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || '').toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: 'products' as Tab, label: 'Товары', icon: Package },
    { id: 'stock' as Tab, label: 'Остатки', icon: Boxes },
    { id: 'orders' as Tab, label: 'Приход', icon: Truck },
    { id: 'suppliers' as Tab, label: 'Поставщики', icon: Building2 },
    { id: 'returns' as Tab, label: 'Возвраты', icon: Undo2 },
    { id: 'movements' as Tab, label: 'Движения', icon: History },
  ];

  if (!scId) {
    return (
      <div className="p-6 text-center text-slate-500 dark:text-slate-400">
        Выберите сервисный центр для работы со складом.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Склад</h1>
        <select
          value={scId}
          onChange={(e) => setActiveCenterId(Number(e.target.value))}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
        >
          {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {message ? (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
          {message.text}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${tab === t.id ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? <div className="flex justify-center py-10"><LoadingSpinner /></div> : null}

      {tab === 'products' && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию, SKU, штрихкоду"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              onClick={() => setProductModal({ open: true, product: null })}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} /> Добавить товар
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Название</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Штрихкод</th>
                  <th className="px-3 py-2 text-right">Остаток</th>
                  <th className="px-3 py-2 text-right">Мин.</th>
                  <th className="px-3 py-2 text-left">Локация</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{p.name}</td>
                    <td className="px-3 py-2 text-slate-500">{p.sku || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{p.barcode || '—'}</td>
                    <td className={`px-3 py-2 text-right font-medium ${(p.low_stock ?? (p.stock_quantity <= p.min_quantity)) ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {p.stock_quantity} {p.unit}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">{p.min_quantity}</td>
                    <td className="px-3 py-2 text-slate-500">{p.location || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => setProductModal({ open: true, product: p })} className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><Pencil size={16} /></button>
                      <button onClick={async () => { if (confirm(`Удалить «${p.name}»?`)) { try { await api.purchases.products.delete(p.id); flash('success', 'Товар удалён'); reload(); } catch (e: any) { flash('error', e?.message); } } }} className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Товары не найдены</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'stock' && (
        <div>
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setWriteoffModal({ open: true })}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <ArrowDownToLine size={16} /> Списать
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Товар</th>
                  <th className="px-3 py-2 text-left">Локация</th>
                  <th className="px-3 py-2 text-right">Остаток</th>
                  <th className="px-3 py-2 text-right">Мин.</th>
                  <th className="px-3 py-2 text-center">Статус</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {stock.map(p => {
                  const low = p.stock_quantity <= p.min_quantity;
                  return (
                    <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700">
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{p.name}</td>
                      <td className="px-3 py-2 text-slate-500">{p.location || '—'}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800 dark:text-slate-100">{p.stock_quantity} {p.unit}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{p.min_quantity}</td>
                      <td className="px-3 py-2 text-center">
                        {low ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/40 dark:text-red-300">Низкий</span>
                          : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">OK</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setWriteoffModal({ open: true, prefill: p.id })} className="text-red-600 hover:text-red-800 dark:text-red-400"><ArrowDownToLine size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
                {stock.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Нет товаров</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div>
          <div className="mb-3 flex justify-end">
            <button onClick={() => setOrderModal(true)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus size={16} /> Новый приход
            </button>
          </div>
          <div className="space-y-3">
            {orders.map(o => {
              const Icon = STATUS_ICONS[o.status] || Clock;
              const total = (o.items || []).reduce((s: number, i: OrderItem) => s + Number(i.quantity) * Number(i.price_per_unit || 0), 0);
              return (
                <div key={o.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon size={18} className="text-slate-500" />
                      <span className="font-medium text-slate-800 dark:text-slate-100">{o.supplier_name || 'Поставщик'}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">{STATUS_LABELS[o.status] || o.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{total.toLocaleString('ru-RU')} ₽</span>
                      {o.status !== 'received' && o.status !== 'cancelled' ? (
                        <button onClick={async () => { if (confirm('Оприходовать заказ на склад?')) { try { await api.purchases.orders.receive(o.id); flash('success', 'Заказ оприходован'); reload(); } catch (e: any) { flash('error', e?.message); } } }} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">Оприходовать</button>
                      ) : null}
                      <button onClick={() => setReturnModal({ open: true, order: o })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">Возврат</button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    Позиций: {o.items?.length || 0} · {new Date(o.created_at).toLocaleString('ru-RU')}
                  </div>
                  {o.notes ? <div className="mt-1 text-sm text-slate-400">{o.notes}</div> : null}
                </div>
              );
            })}
            {orders.length === 0 ? <div className="py-6 text-center text-slate-400">Приходов пока нет</div> : null}
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div>
          <div className="mb-3 flex justify-end">
            <button onClick={() => setSupplierModal({ open: true, supplier: null })} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus size={16} /> Добавить поставщика
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {suppliers.map(s => (
              <div key={s.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{s.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSupplierModal({ open: true, supplier: s })} className="text-blue-600"><Pencil size={16} /></button>
                    <button onClick={async () => { if (confirm(`Удалить поставщика «${s.name}»?`)) { try { await api.purchases.suppliers.delete(s.id); flash('success', 'Поставщик удалён'); reload(); } catch (e: any) { flash('error', e?.message); } } }} className="text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="mt-1 text-sm text-slate-500">{s.contact_person || '—'}{s.phone ? ` · ${s.phone}` : ''}</div>
                {s.email ? <div className="text-sm text-slate-400">{s.email}</div> : null}
              </div>
            ))}
            {suppliers.length === 0 ? <div className="py-6 text-center text-slate-400 sm:col-span-2">Поставщики не добавлены</div> : null}
          </div>
        </div>
      )}

      {tab === 'returns' && <ReturnsTab scId={scId} flash={flash} />}

      {tab === 'movements' && (
        <div className="space-y-2">
          {movements.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.product_name}</div>
                <div className="text-xs text-slate-400">{m.type_label}{m.reason ? ` · ${m.reason}` : ''} · {m.user_name || '—'} · {new Date(m.created_at).toLocaleString('ru-RU')}</div>
              </div>
              <div className={`font-semibold ${m.type === 'writeoff' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {m.type === 'writeoff' ? '−' : '+'}{m.quantity}
              </div>
            </div>
          ))}
          {movements.length === 0 ? <div className="py-6 text-center text-slate-400">Движений пока нет</div> : null}
        </div>
      )}

      {productModal.open ? (
        <ProductModal
          scId={scId}
          product={productModal.product}
          suppliers={suppliers}
          onClose={() => setProductModal({ open: false, product: null })}
          onSaved={() => { setProductModal({ open: false, product: null }); flash('success', 'Сохранено'); reload(); }}
          onScan={() => setScanner({ open: true, target: 'product' })}
        />
      ) : null}

      {supplierModal.open ? (
        <SupplierModal
          scId={scId}
          supplier={supplierModal.supplier}
          onClose={() => setSupplierModal({ open: false, supplier: null })}
          onSaved={() => { setSupplierModal({ open: false, supplier: null }); flash('success', 'Сохранено'); reload(); }}
        />
      ) : null}

      {orderModal ? (
        <OrderModal
          scId={scId}
          suppliers={suppliers}
          products={products}
          onClose={() => setOrderModal(false)}
          onSaved={() => { setOrderModal(false); flash('success', 'Приход создан'); reload(); }}
        />
      ) : null}

      {writeoffModal.open ? (
        <WriteOffModal
          scId={scId}
          products={products}
          prefillProductId={writeoffModal.prefill}
          scanProductId={writeoffScan}
          onConsumeScan={() => setWriteoffScan(null)}
          onClose={() => setWriteoffModal({ open: false })}
          onSaved={() => { setWriteoffModal({ open: false }); flash('success', 'Списание выполнено'); reload(); }}
          onScan={() => setScanner({ open: true, target: 'writeoff' })}
        />
      ) : null}

      {returnModal.open && returnModal.order ? (
        <ReturnModal
          order={returnModal.order}
          onClose={() => setReturnModal({ open: false, order: null })}
          onSaved={() => { setReturnModal({ open: false, order: null }); flash('success', 'Возврат оформлен'); reload(); }}
        />
      ) : null}

      {scanner.open ? (
        <BarcodeScanner
          title={scanner.target === 'product' ? 'Штрихкод товара' : 'Сканирование для списания'}
          onClose={() => setScanner({ open: false, target: scanner.target })}
          onResult={async (code) => {
            setScanner({ open: false, target: scanner.target });
            if (scanner.target === 'product') {
              if (productModal.open) {
                const el = document.getElementById('product-barcode') as HTMLInputElement | null;
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                if (el && setter) { setter.call(el, code); el.dispatchEvent(new Event('input', { bubbles: true })); }
              }
              flash('success', `Штрихкод: ${code}`);
            } else {
              try {
                const p = await api.purchases.products.byBarcode(scId, code);
                if (p?.id) {
                  setWriteoffModal({ open: true });
                  setWriteoffScan(p.id);
                  flash('success', `Найден товар: ${p.name}`);
                } else {
                  flash('error', 'Товар с таким штрихкодом не найден');
                }
              } catch (e: any) {
                flash('error', e?.message || 'Товар не найден');
              }
            }
          }}
        />
      ) : null}
    </div>
  );
}

// ─────────────────────────── sub-components ───────────────────────────

function ReturnsTab({ scId, flash }: { scId: number; flash: (t: 'error' | 'success', m: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setItems(await api.purchases.returns.list(scId)); } catch (e: any) { flash('error', e?.message); }
      setLoading(false);
    })();
  }, [scId]);
  if (loading) return <div className="py-6 text-center text-slate-400">Загрузка…</div>;
  if (items.length === 0) return <div className="py-6 text-center text-slate-400">Возвратов нет</div>;
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{it.product_name}</div>
          <div className="text-xs text-slate-400">Возвращено: {it.returned_quantity} · Поставщик: {it.supplier_name || '—'} · {new Date(it.order_created_at).toLocaleString('ru-RU')}</div>
        </div>
      ))}
    </div>
  );
}

function ProductModal({ scId, product, suppliers, onClose, onSaved, onScan }: any) {
  const [form, setForm] = useState({
    name: product?.name || '',
    supplier_id: product?.supplier_id || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    unit: product?.unit || 'шт',
    default_price: product?.default_price ?? 0,
    min_quantity: product?.min_quantity ?? 0,
    location: product?.location || '',
    stock_quantity: product?.stock_quantity ?? 0,
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setError('');
    const payload = {
      service_center_id: scId,
      name: form.name,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      sku: form.sku,
      barcode: form.barcode,
      unit: form.unit,
      default_price: Number(form.default_price) || 0,
      min_quantity: Number(form.min_quantity) || 0,
      location: form.location,
      stock_quantity: product ? form.stock_quantity : Number(form.stock_quantity) || 0,
    };
    try {
      if (product) await api.purchases.products.update(product.id, payload);
      else await api.purchases.products.create(payload);
      onSaved();
    } catch (e: any) { setError(e?.message || 'Ошибка сохранения'); }
  };

  return (
    <Modal onClose={onClose} title={product ? 'Редактировать товар' : 'Новый товар'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Название *" className="sm:col-span-2">
          <input id="product-name" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Поставщик">
          <select value={form.supplier_id} onChange={(e) => set('supplier_id', e.target.value)} className={inputCls}>
            <option value="">—</option>
            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Ед. изм.">
          <input value={form.unit} onChange={(e) => set('unit', e.target.value)} className={inputCls} />
        </Field>
        <Field label="SKU">
          <input value={form.sku} onChange={(e) => set('sku', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Штрихкод">
          <div className="flex gap-2">
            <input id="product-barcode" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} className={inputCls} />
            <button type="button" onClick={onScan} className="shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 px-2 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><Barcode size={18} /></button>
          </div>
        </Field>
        <Field label="Цена">
          <input type="number" value={form.default_price} onChange={(e) => set('default_price', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Мин. остаток">
          <input type="number" value={form.min_quantity} onChange={(e) => set('min_quantity', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Локация">
          <input value={form.location} onChange={(e) => set('location', e.target.value)} className={inputCls} />
        </Field>
        <Field label={product ? 'Остаток' : 'Начальный остаток'}>
          <input type="number" value={form.stock_quantity} onChange={(e) => set('stock_quantity', e.target.value)} className={inputCls} />
        </Field>
      </div>
      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200">Отмена</button>
        <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Сохранить</button>
      </div>
    </Modal>
  );
}

function SupplierModal({ scId, supplier, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: supplier?.name || '',
    contact_person: supplier?.contact_person || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setError('');
    const payload = { ...form };
    try {
      if (supplier) await api.purchases.suppliers.update(supplier.id, payload);
      else await api.purchases.suppliers.create({ ...payload, service_center_id: scId });
      onSaved();
    } catch (e: any) { setError(e?.message || 'Ошибка'); }
  };

  return (
    <Modal onClose={onClose} title={supplier ? 'Редактировать поставщика' : 'Новый поставщик'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Название *" className="sm:col-span-2"><input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Контакт"><input value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} className={inputCls} /></Field>
        <Field label="Телефон"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></Field>
        <Field label="Email"><input value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></Field>
        <Field label="Адрес" className="sm:col-span-2"><input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} /></Field>
      </div>
      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200">Отмена</button>
        <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Сохранить</button>
      </div>
    </Modal>
  );
}

function OrderModal({ scId, suppliers, products, onClose, onSaved }: any) {
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([{ product_id: '', quantity: 1, price_per_unit: 0 }]);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [quick, setQuick] = useState<any>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const addRow = () => setItems((i: any[]) => [...i, { product_id: '', quantity: 1, price_per_unit: 0 }]);
  const updateRow = (idx: number, k: string, v: any) => setItems((i: any[]) => i.map((r, n) => n === idx ? { ...r, [k]: v } : r));
  const removeRow = (idx: number) => setItems((i: any[]) => i.filter((_, n) => n !== idx));

  const mergeItem = (product: any) => {
    setItems((i: any[]) => {
      const idx = i.findIndex((r) => Number(r.product_id) === product.id);
      if (idx >= 0) return i.map((r, n) => n === idx ? { ...r, quantity: Number(r.quantity) + 1 } : r);
      return [...i, { product_id: product.id, quantity: 1, price_per_unit: Number(product.default_price) || 0 }];
    });
  };

  const handleScan = async (code: string) => {
    const now = Date.now();
    if (lastRef.current.code === code && now - lastRef.current.at < 1200) return;
    lastRef.current = { code, at: now };
    let product: any = null;
    try {
      product = await api.purchases.products.byBarcode(scId, code);
    } catch { product = null; }
    if (product?.id) {
      mergeItem(product);
      setScanMsg({ ok: true, text: `+ ${product.name}` });
    } else {
      setQuick({ barcode: code });
      setScanMsg({ ok: false, text: `Штрихкод ${code} не найден — создайте товар` });
    }
  };

  const save = async () => {
    setError('');
    if (!supplierId) { setError('Выберите поставщика'); return; }
    const clean = items.filter((i: any) => i.product_id).map((i: any) => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) || 1, price_per_unit: Number(i.price_per_unit) || 0 }));
    if (clean.length === 0) { setError('Добавьте хотя бы одну позицию'); return; }
    try {
      await api.purchases.orders.create({ service_center_id: scId, supplier_id: Number(supplierId), notes, items: clean });
      onSaved();
    } catch (e: any) { setError(e?.message || 'Ошибка'); }
  };

  const listedCount = items.filter((i: any) => i.product_id).length;
  const listedUnits = items.reduce((s: number, i: any) => s + (i.product_id ? Number(i.quantity) || 0 : 0), 0);

  return (
    <Modal onClose={onClose} title="Новый приход">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Поставщик *">
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Комментарий"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <select value={it.product_id} onChange={(e) => updateRow(idx, 'product_id', e.target.value)} className={`${inputCls} flex-1 min-w-[160px]`}>
              <option value="">Товар…</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" placeholder="Кол-во" value={it.quantity} onChange={(e) => updateRow(idx, 'quantity', e.target.value)} className={`${inputCls} w-20`} />
            <input type="number" placeholder="Цена" value={it.price_per_unit} onChange={(e) => updateRow(idx, 'price_per_unit', e.target.value)} className={`${inputCls} w-24`} />
            <button onClick={() => removeRow(idx)} className="text-red-600"><Minus size={16} /></button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button onClick={addRow} className="flex items-center gap-1 text-sm text-blue-600"><Plus size={14} /> Добавить позицию</button>
          <button onClick={() => { setScannerOpen(true); setScanMsg(null); }} className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
            <ScanLine size={16} /> Сканировать штрихкоды
          </button>
        </div>
      </div>
      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200">Отмена</button>
        <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Создать приход</button>
      </div>

      {scannerOpen ? (
        <BarcodeScanner
          title="Приход · сканирование"
          continuous
          finishLabel="Завершить"
          onClose={() => setScannerOpen(false)}
          onResult={handleScan}
        >
          <div className="rounded-lg bg-slate-100 dark:bg-slate-900 px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">В списке: {listedCount} поз. · {listedUnits} ед.</span>
            </div>
            {scanMsg ? (
              <div className={`mt-1 text-sm ${scanMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {scanMsg.text}
              </div>
            ) : (
              <div className="mt-1 text-sm text-slate-400">Сканируйте — товары добавляются автоматически</div>
            )}
          </div>
        </BarcodeScanner>
      ) : null}

      {quick ? (
        <QuickProductModal
          scId={scId}
          barcode={quick.barcode}
          onClose={() => setQuick(null)}
          onCreated={(p: any) => { mergeItem(p); setQuick(null); setScanMsg({ ok: true, text: `+ ${p.name}` }); }}
        />
      ) : null}
    </Modal>
  );
}

function QuickProductModal({ scId, barcode, onClose, onCreated }: any) {
  const [name, setName] = useState('');
  const [bar, setBar] = useState(barcode || '');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('шт');
  const [err, setErr] = useState('');

  const save = async () => {
    setErr('');
    if (!name.trim()) { setErr('Укажите название'); return; }
    try {
      const p = await api.purchases.products.create({
        service_center_id: scId,
        name: name.trim(),
        barcode: bar.trim(),
        unit,
        default_price: Number(price) || 0,
        min_quantity: 0,
        location: '',
        stock_quantity: 0,
      });
      onCreated(p);
    } catch (e: any) { setErr(e?.message || 'Ошибка'); }
  };

  return (
    <Modal onClose={onClose} title="Новый товар (не найден в каталоге)">
      <div className="grid gap-3">
        <Field label="Название *"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus /></Field>
        <Field label="Штрихкод"><input value={bar} onChange={(e) => setBar(e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Цена"><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} /></Field>
          <Field label="Ед. изм."><input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} /></Field>
        </div>
      </div>
      {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">Создать и добавить в приход</span>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200">Отмена</button>
          <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Сохранить</button>
        </div>
      </div>
    </Modal>
  );
}

function WriteOffModal({ scId, products, prefillProductId, scanProductId, onConsumeScan, onClose, onSaved, onScan }: any) {
  const [rows, setRows] = useState<any[]>(
    prefillProductId ? [{ product_id: prefillProductId, quantity: 1 }] : [{ product_id: '', quantity: 1 }]
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (scanProductId) {
      setRows((r: any[]) => r.some((x) => x.product_id === scanProductId)
        ? r
        : [...r, { product_id: scanProductId, quantity: 1 }]);
      if (onConsumeScan) onConsumeScan();
    }
  }, [scanProductId]);

  const addRow = () => setRows((r: any[]) => [...r, { product_id: '', quantity: 1 }]);
  const update = (idx: number, k: string, v: any) => setRows((r: any[]) => r.map((x, n) => n === idx ? { ...x, [k]: v } : x));
  const remove = (idx: number) => setRows((r: any[]) => r.filter((_, n) => n !== idx));

  const save = async () => {
    setError('');
    const clean = rows.filter((r: any) => r.product_id && Number(r.quantity) > 0).map((r: any) => ({ product_id: Number(r.product_id), quantity: Number(r.quantity) }));
    if (clean.length === 0) { setError('Добавьте позицию для списания'); return; }
    try {
      await api.purchases.stock.writeOff(scId, clean, reason);
      onSaved();
    } catch (e: any) { setError(e?.message || 'Ошибка'); }
  };

  return (
    <Modal onClose={onClose} title="Списание со склада">
      <div className="flex justify-end">
        <button onClick={onScan} className="mb-2 flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
          <ScanLine size={16} /> Сканировать
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((r, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <select value={r.product_id} onChange={(e) => update(idx, 'product_id', e.target.value)} className={`${inputCls} flex-1 min-w-[160px]`}>
              <option value="">Товар…</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.stock_quantity} {p.unit})</option>)}
            </select>
            <input type="number" placeholder="Кол-во" value={r.quantity} onChange={(e) => update(idx, 'quantity', e.target.value)} className={`${inputCls} w-24`} />
            <button onClick={() => remove(idx)} className="text-red-600"><Minus size={16} /></button>
          </div>
        ))}
        <button onClick={addRow} className="flex items-center gap-1 text-sm text-blue-600"><Plus size={14} /> Добавить позицию</button>
      </div>
      <Field label="Причина" className="mt-3">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} rows={2} />
      </Field>
      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200">Отмена</button>
        <button onClick={save} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Списать</button>
      </div>
    </Modal>
  );
}

function ReturnModal({ order, onClose, onSaved }: any) {
  const [rows, setRows] = useState<any[]>(
    (order.items || []).map((i: any) => ({ item_id: i.id, quantity: 0, max: Number(i.quantity) - Number(i.returned_quantity || 0) }))
  );
  const [error, setError] = useState('');
  const update = (idx: number, v: any) => setRows((r: any[]) => r.map((x, n) => n === idx ? { ...x, quantity: v } : x));

  const save = async () => {
    setError('');
    const clean = rows.filter((r: any) => Number(r.quantity) > 0).map((r: any) => ({ item_id: r.item_id, quantity: Number(r.quantity) }));
    if (clean.length === 0) { setError('Укажите количество для возврата'); return; }
    try {
      await api.purchases.orders.returnItems(order.id, clean);
      onSaved();
    } catch (e: any) { setError(e?.message || 'Ошибка'); }
  };

  return (
    <Modal onClose={onClose} title={`Возврат поставщику · ${order.supplier_name || ''}`}>
      <div className="space-y-2">
        {rows.map((r, idx) => {
          const item = order.items.find((i: any) => i.id === r.item_id);
          return (
            <div key={r.item_id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-800 dark:text-slate-100">{item?.product_name || `Позиция ${r.item_id}`}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">макс {r.max}</span>
                <input type="number" min={0} max={r.max} value={r.quantity} onChange={(e) => update(idx, e.target.value)} className={`${inputCls} w-20`} />
              </div>
            </div>
          );
        })}
      </div>
      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200">Отмена</button>
        <button onClick={save} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Оформить возврат</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────── ui helpers ───────────────────────────

const inputCls = "w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
