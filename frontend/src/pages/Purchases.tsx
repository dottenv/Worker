import { useState, useEffect, useCallback } from 'react';
import { useCenters } from '../contexts/CenterContext';
import { api } from '../api/client';
import { useSocketEvent } from '../contexts/SocketContext';
import { ShoppingCart, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  ordered: 'Заказано',
  received: 'Получено',
  cancelled: 'Отменено',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-gray-500 bg-gray-100',
  ordered: 'text-blue-600 bg-blue-50',
  received: 'text-emerald-600 bg-emerald-50',
  cancelled: 'text-red-600 bg-red-50',
};

const STATUS_ICONS: Record<string, any> = {
  draft: Clock,
  ordered: Truck,
  received: CheckCircle,
  cancelled: XCircle,
};

export default function Purchases() {
  const { centers, activeCenterId } = useCenters();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.purchases.orders.list(activeCenterId ?? undefined);
      setOrders(Array.isArray(res) ? res : []);
    } catch {}
    finally { setLoading(false); }
  }, [activeCenterId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useSocketEvent('purchases:updated', () => { fetchOrders(); });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Закупки</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Заказы поставщикам</p>
      </div>

      {centers.length > 1 && activeCenterId && (
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {centers.find(c => c.id === activeCenterId)?.name || ''}
        </div>
      )}

      {loading ? <LoadingSpinner /> : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <ShoppingCart size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Нет заказов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const StatusIcon = STATUS_ICONS[order.status] || Clock;
            const sc = STATUS_COLORS[order.status] || 'text-gray-500 bg-gray-50';
            return (
              <div key={order.id} className="rounded-xl p-4 transition-colors"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${sc}`}>
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
                    {order.items && order.items.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {order.items.map((item: any, i: number) => (
                          <p key={i} className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-disabled)' }}>
                            <Package size={10} />
                            {item.product_name} — {item.quantity} {item.product_unit} × {item.price_per_unit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-disabled)' }}>
                      {new Date(order.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
