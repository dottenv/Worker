import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => onChange(!value)} disabled={disabled}
      className="relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 disabled:opacity-50"
      style={{ backgroundColor: value ? 'var(--accent)' : '#e5e5ea' }}>
      <span className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export function Cell({ icon: Icon, label, value, onClick }: { icon: any; label: string; value?: string; onClick?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[44px] border-b cursor-pointer active:opacity-60"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      onClick={onClick}>
      <Icon size={20} style={{ color: 'var(--accent)' }} />
      <span className="flex-1 text-[15px]" style={{ color: 'var(--text-primary)' }}>{label}</span>
      {value && <span className="text-[15px]" style={{ color: 'var(--text-disabled)' }}>{value}</span>}
      {onClick && <ChevronRight size={16} style={{ color: 'var(--text-disabled)' }} />}
    </div>
  );
}

export function CellToggle({ icon: Icon, label, value, onChange, disabled }: { icon: any; label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b min-h-[44px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <Icon size={20} style={{ color: 'var(--accent)' }} />
      <span className="flex-1 text-[15px]" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <Toggle value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      {title && (
        <p className="text-[13px] font-semibold uppercase tracking-wide px-4 mb-1.5" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      )}
      <div className="rounded-xl overflow-hidden mx-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  );
}
