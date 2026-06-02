import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Phone, Building2, Calendar, MessageCircle, Globe, Save, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTelegram, setEditTelegram] = useState('');
  const [editMax, setEditMax] = useState('');
  const [saving, setSaving] = useState(false);

  const isOwn = String(currentUser?.id) === userId;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/auth/profile/${userId}`)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));

    api.get(`/auth/profile/${userId}/centers`)
      .then(setCenters)
      .catch(() => {});
  }, [userId]);

  const startEditing = () => {
    setEditTelegram(profile?.telegram || '');
    setEditMax(profile?.max_link || '');
    setEditing(true);
  };

  const saveSocial = async () => {
    setSaving(true);
    try {
      const updated = await api.put('/auth/profile', { telegram: editTelegram, max_link: editMax });
      setProfile((prev: any) => ({ ...prev, telegram: updated.telegram, max_link: updated.max_link }));
      setEditing(false);
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;
  if (!profile) return <p className="text-sm text-gray-400 text-center py-8">Пользователь не найден</p>;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Назад
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: profile.color || '#e0e7ff' }}>
          <span className="text-2xl font-bold text-white">
            {profile.full_name?.slice(0, 1) || '?'}
          </span>
        </div>
        <h1 className="text-lg font-bold text-gray-900">{profile.full_name}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{profile.email}</p>

        {profile.phone && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-sm text-gray-500">
            <Phone size={13} />
            {profile.phone}
          </div>
        )}

        {(profile.telegram || profile.max_link || isOwn) && (
          <div className="flex items-center justify-center gap-3 mt-3">
            {editing ? (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} className="text-sky-500 shrink-0" />
                  <input type="text" value={editTelegram} onChange={e => setEditTelegram(e.target.value)}
                    placeholder="@username"
                    className="flex-1 px-3 py-1.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-gray-400 shrink-0" />
                  <input type="text" value={editMax} onChange={e => setEditMax(e.target.value)}
                    placeholder="https://"
                    className="flex-1 px-3 py-1.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveSocial} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 text-white py-1.5 rounded-xl text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    <Save size={13} /> {saving ? '...' : 'Сохранить'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {profile.telegram && (
                  <a href={`https://t.me/${profile.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl hover:bg-sky-100 transition-colors">
                    <MessageCircle size={13} />
                    {profile.telegram}
                  </a>
                )}
                {profile.max_link && (
                  <a href={profile.max_link.startsWith('http') ? profile.max_link : `https://${profile.max_link}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                    <Globe size={13} />
                    Max
                  </a>
                )}
                {isOwn && !profile.telegram && !profile.max_link && (
                  <button onClick={startEditing}
                    className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
                    + Добавить соцсети
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {isOwn && !editing && (profile.telegram || profile.max_link) && (
          <button onClick={startEditing}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Редактировать
          </button>
        )}
      </div>

      {centers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 size={15} className="text-gray-400" />
            Склады
          </h3>
          <div className="space-y-2">
            {centers.map((sc: any) => (
              <Link key={sc.id} to={`/centers/${sc.id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 rounded-xl bg-indigo-50">
                  <Building2 size={15} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{sc.address ? `${sc.name} (${sc.address})` : sc.name}</p>
                  <p className="text-xs text-gray-400">{sc.role === 'owner' ? 'Владелец' : sc.role === 'admin' ? 'Админ' : 'Сотрудник'}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar size={14} />
          Зарегистрирован: {new Date(profile.created_at).toLocaleDateString('ru')}
        </div>
      </div>
    </div>
  );
}
