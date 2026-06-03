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
} from 'lucide-react';

interface CenterGroup {
  service_center_id: number;
  service_center_name: string;
  service_center_address: string;
  entries: TimeEntryWithDocs[];
}

interface DocItem {
  id: number;
  original_name: string;
  mime_type: string;
  url: string;
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
}

export default function ShiftDocumentsList() {
  const { isOwner } = useAuth();
  const [groups, setGroups] = useState<CenterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.timeEntries.withDocuments().then(data => {
      setGroups(data);
      setExpanded(new Set(data.map((g: CenterGroup) => g.service_center_id)));
    }).finally(() => setLoading(false));
  }, []);

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

  const toggleEntry = (id: number) => {
    setExpandedEntries(prev => {
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
            <div className="flex items-center gap-2">
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
                const isExpanded = expandedEntries.has(entry.id);
                return (
                  <div key={entry.id}>
                    <button onClick={() => toggleEntry(entry.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock size={14} className="text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {entry.date}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {entry.clock_in && new Date(entry.clock_in).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                            {entry.clock_out && ` – ${new Date(entry.clock_out).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`}
                            {isOwner && entry.user_name && ` · ${entry.user_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasDocs && (
                          <span className="flex items-center gap-1 text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                            <Image size={10} />
                            {entry.documents.length}
                          </span>
                        )}
                        {isExpanded
                          ? <ChevronUp size={14} className="text-gray-400" />
                          : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-2">
                        {entry.notes && (
                          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-2.5">
                            {entry.notes}
                          </p>
                        )}

                        {hasDocs ? (
                          <div className="flex flex-wrap gap-2">
                            {entry.documents.map(doc => (
                              <div key={doc.id} className="group relative">
                                {doc.mime_type?.startsWith('image/') ? (
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                    <img src={doc.url} alt={doc.original_name}
                                      className="w-20 h-20 rounded-xl object-cover border border-gray-200 hover:opacity-80 transition-opacity" />
                                  </a>
                                ) : (
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                                    <FileText size={20} className="text-gray-400" />
                                    <span className="text-[8px] text-gray-400 mt-1 truncate max-w-full px-1">
                                      {doc.original_name?.split('.').pop()}
                                    </span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">Нет прикреплённых файлов</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
