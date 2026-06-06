import { Link } from 'react-router-dom';
import { Settings2 } from 'lucide-react';

export default function PageHeader() {
  return (
    <header className="sticky top-0 z-50 h-16 port-glass-nav border-b border-port-border px-4 sm:px-8 flex items-center relative">

      {/* Left: Logo */}
      <div className="flex items-center gap-2.5 shrink-0 z-10 port-header-fade">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full border border-port-accent/40 bg-port-accent-bg flex items-center justify-center shrink-0">
            <span className="font-serif text-port-accent text-base leading-none">T</span>
          </div>
          <div className="flex flex-col leading-none gap-0.5">
            <span className="font-semibold text-[13px] tracking-tight text-port-ink leading-none">Tohid Dayhami</span>
            <span className="text-[10px] text-port-soft tracking-wide leading-none">Business Solutions Center</span>
          </div>
        </Link>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0 z-10 ml-auto">
        <Link
          to="/admin"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-port-surface border border-transparent hover:border-port-border transition-all text-port-soft hover:text-port-ink"
          aria-label="Admin"
        >
          <Settings2 className="w-4 h-4" strokeWidth={1.5} />
        </Link>
      </div>
    </header>
  );
}
