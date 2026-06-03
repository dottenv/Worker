import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Image,
  Loader2,
  Trash2,
} from 'lucide-react';
import PhotoLightbox from '../components/PhotoLightbox';

interface DocItem {
  id: number;
  original_name: string;
  mime_type: string;
  url: string;
}

interface CustomValue {
  id: number;
  custom_field_id: number;
  field_name: string;
  field_type: string;
  value: string;
}

interface TimeEntryWithDocs {
  id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  user_name: string;
  status: string;
  notes: string;
  documents: DocItem[];
  custom_values: CustomValue[];
}

interface CenterGroup {
  service_center_id: number;
  service_center_name: string;
  service_center_address: string;
  entries: TimeEntryWithDocs[];
}

export default function ShiftDocumentsList() {
  const { isOwner } = useAuth();
  const [groups, setGroups] = useState<CenterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [lightbox, setLightbox] = useState<{ docs: DocItem[]; index: number } | null>(null);

  const isManager = isOwner;

  useEffect(() => {
    let cancelled = false;
    api.timeEntries.withDocuments().then((data: CenterGroup[]) => {
      if (cancelled) return;
      setLoading(false);
      setGroups(data);
      if (data.length > 0) {
        setExpanded(new Set(data.map(g => g.service_center_id)));
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm('Удалить документ?')) return;
    try {
      await api.shiftDocuments.delete(docId);
      const data = await api.timeEntries.withDocuments();
      setGroups(data as CenterGroup[]);
    } catch { /* ignore */ }
    setLightbox(null);
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!confirm('Удалить всю запись о смене вместе с файлами и данными?')) return;
    try {
      await api.timeEntries.delete(entryId);
      const data = await api.timeEntries.withDocuments();
      setGroups(data as CenterGroup[]);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-400">Нет завершённых смен с документами</p>
      </div>
    );
  }

  const toggleCenter = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Документы смен</h1>
      <p className="text-xs text-gray-400">Все завершённые смены с прикреплёнными файлами</p>

      {groups.map(center => (
        <div key={center.service_center_id}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button onClick={() => toggleCenter(center.service_center_id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 size={16} className="text-indigo-500 shrink-0" />
              <span className="text-sm font-semibold text-gray-900 truncate">
                {center.service_center_name}
              </span>
              {center.service_center_address && (
                <span className="text-[10px] text-gray-400 hidden sm:inline">
                  {center.service_center_address}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-gray-400">{center.entries.length} смен</span>
              {expanded.has(center.service_center_id)
                ? <ChevronUp size={14} className="text-gray-400" />
                : <ChevronDown size={14} className="text-gray-400" />}
            </div>
          </button>

          {expanded.has(center.service_center_id) && (
            <div className="border-t border-gray-50 divide-y divide-gray-50">
              {center.entries.map(entry => {
                const hasDocs = entry.documents.length > 0;
                const hasCustom = entry.custom_values?.length > 0;
                return (
                  <div key={entry.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock size={13} className="text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                          {entry.date}
                        </span>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">
                          {entry.clock_in && new Date(entry.clock_in).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                          {entry.clock_out && ` – ${new Date(entry.clock_out).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                        {isOwner && entry.user_name && (
                          <span className="text-[11px] text-indigo-500 font-medium whitespace-nowrap">
                            {entry.user_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isManager && (
                          <button onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Удалить смену">
                            <Trash2 size={13} />
                          </button>
                        )}
                        {hasDocs && (
                          <span className="flex items-center gap-1 text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            <Image size={10} />
                            {entry.documents.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {entry.notes && (
                      <p className="text-xs text-gray-500">{entry.notes}</p>
                    )}

                    {hasCustom && (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.custom_values.map(cv => (
                          <div key={cv.id}
                            className="bg-gray-50 rounded-lg px-2 py-1 text-xs text-gray-700">
                            <span className="text-[10px] text-gray-400 mr-1">{cv.field_name}:</span>
                            {cv.field_type === 'money'
                              ? `${Number(cv.value).toLocaleString('ru')} ₽`
                              : cv.value}
                          </div>
                        ))}
                      </div>
                    )}

                    {hasDocs && (
                      <div className="flex flex-wrap gap-1.5 items-start">
                        {entry.documents.map((doc, i) => (
                          <button key={doc.id} onClick={() => setLightbox({ docs: entry.documents, index: i })}
                            className="shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            style={{ width: 64, height: 64 }}>
                            {doc.mime_type?.startsWith('image/') ? (
                              <img src={doc.url} alt={doc.original_name}
                                className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center w-full h-full">
                                <FileText size={18} className="text-gray-400" />
                                <span className="text-[7px] text-gray-400 mt-0.5 truncate max-w-full px-0.5">
                                  {doc.original_name?.split('.').pop()}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {lightbox && (
        <PhotoLightbox
          docs={lightbox.docs}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onDelete={isManager ? handleDeleteDoc : undefined}
        />
      )}
    </div>
  );
}
