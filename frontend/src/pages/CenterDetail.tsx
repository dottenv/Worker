import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  Users,
  UserPlus,
  X,
  MapPin,
  Phone,
  Calendar,
  Check,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CenterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [center, setCenter] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, m] = await Promise.all([
        api.serviceCenters.get(Number(id)),
        api.members.list(Number(id)),
      ]);
      setCenter(c);
      setMembers(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim() || !id) return;
    setInviting(true);
    setInviteError('');
    try {
      await api.members.add(Number(id), { email: email.trim() });
      setEmail('');
      setShowInvite(false);
      fetchData();
    } catch (err: any) {
      setInviteError(err.message || 'Ошибка');
    } finally {
      setInviting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Удалить сотрудника?')) return;
    try {
      await api.members.remove(Number(id), memberId);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = () => {
    setEditName(center.name);
    setEditDescription(center.description || '');
    setEditAddress(center.address || '');
    setEditPhone(center.phone || '');
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!editName.trim() || !id) return;
    setSaving(true);
    try {
      await api.serviceCenters.update(Number(id), {
        name: editName.trim(),
        description: editDescription,
        address: editAddress,
        phone: editPhone,
      });
      setShowEdit(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCenter = async () => {
    if (!id) return;
    if (!confirm('Удалить склад навсегда? Все данные (смены, сотрудники, документы) будут безвозвратно удалены.')) return;
    if (!confirm('Вы уверены? Это действие необратимо.')) return;
    try {
      await api.serviceCenters.delete(Number(id));
      navigate('/centers');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!center) return <p className="text-sm text-gray-400">Склад не найден</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{center.address ? `${center.name} (${center.address})` : center.name}</h1>
          <p className="text-xs text-gray-400">
            {center.role === 'owner' ? 'Владелец' : 'Сотрудник'}
          </p>
        </div>
        {center.role === 'owner' && (
          <div className="flex items-center gap-1">
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Pencil size={14} />
              Редактировать
            </button>
            <button
              onClick={handleDeleteCenter}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium ml-2"
            >
              <Trash2 size={14} />
              Удалить
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <MapPin size={15} className="text-gray-300 shrink-0" />
          <span className="text-sm text-gray-600">
            {center.address || 'Адрес не указан'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Phone size={15} className="text-gray-300 shrink-0" />
          <span className="text-sm text-gray-600">
            {center.phone || 'Телефон не указан'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              Сотрудники ({members.length})
            </h3>
          </div>
          {['owner', 'admin'].includes(center.role) && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              <UserPlus size={13} />
              Пригласить
            </button>
          )}
        </div>
        {members.length === 0 ? (
          <div className="p-5 text-center text-sm text-gray-400">
            Нет сотрудников
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map((m: any) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-gray-500">
                    {m.user.full_name?.slice(0, 1) || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {m.user.full_name}
                  </p>
                  <p className="text-xs text-gray-400">{m.user.email}</p>
                </div>
                {center.role === 'owner' && m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {['owner', 'admin'].includes(center.role) && (
        <Link
          to={`/centers/${id}/shifts`}
          className="flex items-center justify-center gap-2 bg-amber-50 text-amber-700 py-3 rounded-2xl text-sm font-medium hover:bg-amber-100 transition-colors"
        >
          <Clock size={16} />
          Типы смен
        </Link>
      )}
      {['owner', 'admin'].includes(center.role) && (
        <Link
          to={`/centers/${id}/custom-fields`}
          className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-3 rounded-2xl text-sm font-medium hover:bg-emerald-100 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Поля закрытия смены
        </Link>
      )}
      <Link
        to={['owner', 'admin'].includes(center.role) ? '/schedule/admin' : '/schedule'}
        className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-2xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
      >
        <Calendar size={16} />
        Открыть график
      </Link>

      {showEdit && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-20 p-5 animate-modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-3 animate-modal-body">
            <h3 className="text-sm font-semibold text-gray-900">
              Редактировать центр
            </h3>
            <input
              type="text"
              placeholder="Название"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
            <textarea
              placeholder="Описание"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
              rows={2}
            />
            <input
              type="text"
              placeholder="Адрес"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <input
              type="text"
              placeholder="Телефон"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 py-2 rounded-xl text-sm text-gray-500 bg-gray-50 hover:bg-gray-100"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check size={15} />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-20 p-5 animate-modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl animate-modal-body">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Пригласить сотрудника
            </h3>
            <input
              type="email"
              placeholder="Email сотрудника"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 mb-3"
            />
            {inviteError && (
              <p className="text-xs text-red-500 mb-3">{inviteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 py-2 rounded-xl text-sm text-gray-500 bg-gray-50 hover:bg-gray-100"
              >
                Отмена
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !email.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check size={15} />
                {inviting ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
