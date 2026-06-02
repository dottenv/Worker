import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function EmployeeCard() {
  const { scId, memberId } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scId || !memberId) return;
    setLoading(true);
    api.members
      .get(Number(scId), Number(memberId))
      .then(setMember)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [scId, memberId]);

  if (loading) return <LoadingSpinner />;
  if (!member) return <p className="text-sm text-gray-400">Сотрудник не найден</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-indigo-600"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {member.user.full_name}
          </h1>
          <p className="text-xs text-gray-400">Сотрудник</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <User size={24} className="text-indigo-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900">
              {member.user.full_name}
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Mail size={11} />
              {member.user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2.5">
        <Link
          to="/schedule"
          className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Calendar size={15} />
          График
        </Link>
      </div>
    </div>
  );
}
