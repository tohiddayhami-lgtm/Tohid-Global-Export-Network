import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings2, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'Services', to: '/services' },
  { label: 'Contact Us', to: '/contact' },
];

export default function PageHeader() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
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

        {/* Center: truly centered via absolute */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <nav className="pointer-events-auto hidden sm:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                    active
                      ? 'bg-port-accent-bg text-port-accent border border-port-accent/25'
                      : 'text-port-soft hover:text-port-ink hover:bg-port-surface'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
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
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="sm:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-port-surface border border-transparent hover:border-port-border transition-all text-port-soft hover:text-port-ink"
            aria-label="Menu"
          >
            {mobileOpen
              ? <X className="w-4 h-4" strokeWidth={1.5} />
              : <Menu className="w-4 h-4" strokeWidth={1.5} />}
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="sm:hidden fixed top-16 inset-x-0 z-40 port-glass-nav border-b border-port-border shadow-lg">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-[14px] font-medium transition-all ${
                    active
                      ? 'text-port-accent bg-port-accent-bg border border-port-accent/20'
                      : 'text-port-soft hover:text-port-ink hover:bg-port-surface'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
