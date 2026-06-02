import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Upload, Trash2, Image, FileText,
  Clock, Save, Loader2, CheckCircle2, AlertCircle,
  Download,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ShiftDocuments() {
  const { entryId } = useParams<{ entryId: string }>();
  const { isOwner } = useAuth();
  const [entry, setEntry] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!entryId) return;
    setLoading(true);
    try {
      const [entries, documents] = await Promise.all([
        api.timeEntries.my(),
        api.shiftDocuments.list(Number(entryId)),
      ]);
      const found = entries.find((e: any) => e.id === Number(entryId));
      setEntry(found);
      setDocs(documents);
      if (found) {
        setClockIn(found.clock_in ? new Date(found.clock_in).toISOString().slice(0, 16) : '');
        setClockOut(found.clock_out ? new Date(found.clock_out).toISOString().slice(0, 16) : '');
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [entryId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entryId) return;
    setUploading(true);
    try {
      const doc = await api.shiftDocuments.upload(Number(entryId), file);
      setDocs(prev => [doc, ...prev]);
    } catch (err: any) {
      setMessage({ ok: false, text: err.message });
      setTimeout(() => setMessage(null), 3000);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (docId: number) => {
    try {
      await api.shiftDocuments.delete(docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      setMessage({ ok: false, text: err.message });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveTime = async () => {
    if (!entry) return;
    setSaving(true);
    setMessage(null);
    try {
      const data: any = {};
      if (clockIn) data.clock_in = new Date(clockIn).toISOString();
      if (clockOut) data.clock_out = new Date(clockOut).toISOString();
      await api.timeEntries.update(entry.id, data);
      setMessage({ ok: true, text: 'Время сохранено' });
      setEditMode(false);
      load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.message });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) return <LoadingSpinner />;
  if (!entry) return <div className="text-center py-8 text-gray-400">Смена не найдена</div>;

  const isManager = isOwner;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Документы смены</h1>
        <p className="text-xs text-gray-400">
          {entry.service_center_name} &middot; {entry.date}
        </p>
      </div>

      {/* Time editing */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Время смены</h3>
          {isManager && !editMode && (
            <button onClick={() => setEditMode(true)}
              className="text-xs text-indigo-600 font-medium">Редактировать</button>
          )}
        </div>
        {editMode ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Начало</label>
                <input type="datetime-local" value={clockIn}
                  onChange={e => setClockIn(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Конец</label>
                <input type="datetime-local" value={clockOut}
                  onChange={e => setClockOut(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveTime} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Сохранить
              </button>
              <button onClick={() => setEditMode(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Отмена</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <Clock size={16} className="text-indigo-500" />
              <div>
                <p className="text-sm text-gray-700">
                  {entry.clock_in ? new Date(entry.clock_in).toLocaleString('ru') : '—'}
                </p>
                <p className="text-[10px] text-gray-400">Начало</p>
              </div>
            </div>
            {entry.clock_out && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Clock size={16} className="text-emerald-500" />
                <div>
                  <p className="text-sm text-gray-700">
                    {new Date(entry.clock_out).toLocaleString('ru')}
                  </p>
                  <p className="text-[10px] text-gray-400">Конец</p>
                </div>
              </div>
            )}
            {entry.duration_hours && (
              <p className="text-xs text-gray-400">
                Длительность: {entry.duration_hours}ч{entry.break_minutes ? ` (перерыв ${entry.break_minutes}мин)` : ''}
              </p>
            )}
          </div>
        )}
        {message && (
          <div className={`flex items-center gap-1.5 mt-2 text-xs ${message.ok ? 'text-emerald-600' : 'text-red-500'}`}>
            {message.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {message.text}
          </div>
        )}
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Прикреплённые файлы</h3>
        <input type="file" ref={fileRef} onChange={handleUpload}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Загрузка...' : 'Загрузить файл'}
        </button>
      </div>

      {/* Documents list */}
      {docs.length === 0 ? (
        <div className="text-center py-8">
          <FileText size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Нет прикреплённых файлов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 shrink-0">
                {doc.mime_type?.startsWith('image/') ? (
                  <Image size={18} className="text-indigo-500" />
                ) : (
                  <FileText size={18} className="text-indigo-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.original_name}</p>
                <p className="text-[10px] text-gray-400">
                  {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} КБ` : ''}
                  {doc.created_at ? ` · ${new Date(doc.created_at).toLocaleString('ru')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {doc.mime_type?.startsWith('image/') ? (
                  <button onClick={() => window.open(doc.url, '_blank')}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors">
                    <Download size={16} />
                  </button>
                ) : (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors">
                    <Download size={16} />
                  </a>
                )}
                {isManager && (
                  <button onClick={() => handleDelete(doc.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
