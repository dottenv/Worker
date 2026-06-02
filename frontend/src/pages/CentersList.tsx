import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  Building2,
  Plus,
  X,
  ArrowRight,
  Users,
} from 'lucide-react';
import { ListSkeleton } from '../components/Skeleton';

interface Center {
  id: number;
  name: string;
  description: string;
  address?: string;
  members_count: number;
  role: string;
}

export default function CentersList() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.serviceCenters
      .list()
      .then(setCenters)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.serviceCenters.create({ name, description });
      setName('');
      setDescription('');
      setShowForm(false);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Центры</h1>
          <p className="text-sm text-gray-400">
            {centers.length} {centers.length === 1 ? 'центр' : 'центров'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Отмена' : 'Создать'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3"
        >
          <input
            type="text"
            placeholder="Название центра"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:bg-white transition-colors"
            required
          />
          <textarea
            placeholder="Описание (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:bg-white transition-colors resize-none"
            rows={2}
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Создание...' : 'Создать'}
          </button>
        </form>
      )}

      {loading ? (
        <ListSkeleton count={3} />
      ) : centers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="p-3 rounded-xl bg-gray-50 mb-3">
            <Building2 size={28} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-400">Нет сервисных центров</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-sm text-indigo-600 font-medium hover:underline"
          >
            Создать первый
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {centers.map((c) => (
            <Link
              key={c.id}
              to={`/centers/${c.id}`}
              className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 truncate">
                  {c.address ? `${c.name} (${c.address})` : c.name}
                </h3>
                {c.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {c.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Users size={12} />
                    {c.members_count}
                  </span>
                  <span className="text-xs text-gray-400">
                    {c.role === 'owner' ? 'Владелец' : 'Участник'}
                  </span>
                </div>
              </div>
              <ArrowRight size={16} className="text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
