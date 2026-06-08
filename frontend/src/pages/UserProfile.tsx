import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Phone, Building2, Calendar, Globe, Save, X, LogOut, User as UserIcon, Mail } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [editMax, setEditMax] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const isOwn = String(currentUser?.id) === userId;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/auth/profile/${userId}`)
      .then(profileData => {
        setProfile(profileData);
        if (isOwn) {
          setFullName(profileData.full_name || '');
          setEmail(profileData.email || '');
          setPhone(profileData.phone || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    api.get(`/auth/profile/${userId}/centers`)
      .then(setCenters)
      .catch(() => {});
  }, [userId]);

  const startEditing = () => {
    setEditMax(profile?.max_link || '');
    setEditing(true);
  };

  const saveSocial = async () => {
    setSaving(true);
    try {
      const updated = await api.put('/auth/profile', { max_link: editMax });
      setProfile((prev: any) => ({ ...prev, max_link: updated.max_link }));
      setEditing(false);
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const saveProfile = async () => {
    // Валидация
    if (!fullName.trim()) {
      alert('Введите ФИО');
      return;
    }
    if (!email.trim()) {
      alert('Введите email');
      return;
    }

    setProfileSaving(true);
    try {
      const updated = await api.put('/auth/profile', { 
        full_name: fullName, 
        email: email, 
        phone: phone || null 
      });
      setProfile((prev: any) => ({ 
        ...prev, 
        full_name: updated.full_name, 
        email: updated.email, 
        phone: updated.phone 
      }));
      setProfileEditing(false);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Ошибка сохранения');
    }
    setProfileSaving(false);
  };

  if (loading) return <LoadingSpinner />;
  if (!profile) return <p className="text-sm text-gray-400 text-center py-8">Пользователь не найден</p>;

  return (
    <div className="space-y-5">

       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
         <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
           style={{ backgroundColor: profile.color || '#e0e7ff' }}>
           <span className="text-2xl font-bold text-white">
             {profile.full_name?.slice(0, 1) || '?'}
           </span>
         </div>
         <h1 className="text-lg font-bold text-gray-900">{profile.full_name}</h1>
         <p className="text-xs text-gray-400 mt-0.5">{profile.email}</p>
         {isOwn && (
           <div className="flex items-center justify-center mt-4">
             {profileEditing ? (
               <button onClick={saveProfile} disabled={profileSaving}
                 className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 transition-colors">
                 <Save size={13} />
                 {profileSaving ? 'Сохранение...' : 'Сохранить'}
               </button>
             ) : (
               <button onClick={() => setProfileEditing(true)}
                 className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
                 <UserIcon size={14} />
                 Редактировать профиль
               </button>
             )}
           </div>
         )}
         {!isOwn && (
           <div className="mt-2">
             {profile.color && (
               <div className="w-4 h-4 rounded-full" style={{ backgroundColor: profile.color }} />
             )}
           </div>
         )}

        {profile.phone && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-sm text-gray-500">
            <Phone size={13} />
            {profile.phone}
          </div>
        )}

         {(isOwn && profileEditing) || (!isOwn && profile.max_link) && (
           <div className="flex flex-col gap-4 w-full mt-4">
             {isOwn && profileEditing ? (
               <>
                 <div className="space-y-3">
                   <label className="text-xs font-medium mb-1 block text-gray-500">Имя и фамилия</label>
                   <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                     className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
                     style={{ backgroundColor: 'gray-50', color: 'gray-900', border: '1px solid gray-200' }} />
                 </div>
                 
                 <div className="space-y-3">
                   <label className="text-xs font-medium mb-1 block text-gray-500">Email</label>
                   <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
                     style={{ backgroundColor: 'gray-50', color: 'gray-900', border: '1px solid gray-200' }} />
                 </div>
                 
                 <div className="space-y-3">
                   <label className="text-xs font-medium mb-1 block text-gray-500">Телефон</label>
                   <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67"
                     className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
                     style={{ backgroundColor: 'gray-50', color: 'gray-900', border: '1px solid gray-200' }} />
                 </div>
               </>
             ) : (
            <div className="flex items-center justify-center gap-3 mt-3">
                  {profile.max_link && (
                   <a href={profile.max_link.startsWith('http') ? profile.max_link : `https://${profile.max_link}`}
                     target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                     <Globe size={13} />
                     Max
                   </a>
                 )}
                  {isOwn && !profile.max_link && (
                    <button onClick={() => setProfileEditing(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
                      + Добавить соцсети
                    </button>
                  )}
               </div>
             )}
           </div>
         )}

        {isOwn && !editing && profile.max_link && (
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

      {isOwn && (
        <button onClick={logout}
          className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl text-sm font-medium bg-white border border-gray-100 shadow-sm text-red-500 hover:text-red-600 transition-colors">
          <LogOut size={16} />
          Выйти из аккаунта
        </button>
      )}
    </div>
  );
}
