import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { ArrowLeft, Phone, Building2, Calendar } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
