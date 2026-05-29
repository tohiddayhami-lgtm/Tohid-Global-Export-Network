import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings2, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact Us' },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <header className="sticky top-0 z-50 port-glass-nav border-b border-port-border">
      <div className="h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 port-header-fade">
          <div className="w-8 h-8 rounded-full border border-port-accent/40 bg-port-accent-bg flex items-center justify-center">
            <span className="font-serif text-port-accent text-base leading-none">T</span>
          </div>
          <span className="font-semibold text-[14px] tracking-tight hidden sm:block text-port-ink">
            Tohid Global Export
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? 'text-port-accent'
                  : 'text-port-soft hover:text-port-ink'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to="/admin"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-port-surface border border-transparent hover:border-port-border transition-all text-port-soft hover:text-port-ink"
            aria-label="Admin Panel"
          >
            <Settings2 className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-port-surface border border-transparent hover:border-port-border transition-all text-port-soft hover:text-port-ink"
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-port-border bg-port-surface px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? 'bg-port-accent-bg text-port-accent border border-port-accent/20'
                  : 'text-port-soft hover:bg-port-border/40 hover:text-port-ink'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
