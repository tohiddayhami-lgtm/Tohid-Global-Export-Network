/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search, ArrowRight, ArrowLeft, Globe, Settings2, Pencil, X, ExternalLink, Menu,
  type LucideIcon,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'Services', to: '/services' },
  { label: 'Contact Us', to: '/contact' },
];
import type { Category, Country } from './hydrateNetwork.ts';
import { DEFAULT_ROOT_NODE_LINES, useExportData } from './networkContext.tsx';
import { useLocale } from './i18n/LocaleContext.tsx';
import SeoHead from './SeoHead.tsx';

type AppLevel = 0 | 1 | 2 | 3;

// ── Flag icons ─────────────────────────────────────────────────────────────

const FlagIcon = ({ id, className = 'w-6 h-6' }: { id: string; className?: string }) => {
  switch (id) {
    case 'iran':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <path d="M4 8h16M4 12h16M4 16h16" /><circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'india':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <path d="M4 8h16M4 16h16" /><circle cx="12" cy="12" r="2" />
          <path d="M12 10v4M10 12h4" />
        </svg>
      );
    case 'turkey':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <path d="M12 8a4 4 0 1 0 0 8 4.2 4.2 0 0 1 0-8" />
          <path d="M15 11l1 1-1 1" />
        </svg>
      );
    case 'uae':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <path d="M4 6v12M4 6h4v12H4zM8 6h12M8 12h12M8 18h12" />
        </svg>
      );
    case 'oman':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
          strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 5h5.25v14H4zM9.25 5H20v14H9.25z" />
          <path d="M6.1 10.2L6.5 14l.4-3.8" />
          <path d="M5.35 11.4l2.3 1.4M7.65 11.4l-2.3 1.4" />
        </svg>
      );
    case 'china':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <path d="M4 4h16v16H4z" />
          <path d="M8 9l.8 2.4-2-1.5h2.4l-2 1.5z" />
        </svg>
      );
    case 'vietnam':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <path d="M12 6l1.5 4.5H18l-3.5 2.5 1.5 4.5-4-2.5-4 2.5 1.5-4.5L5 10.5h4.5z" />
        </svg>
      );
    case 'germany':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
          strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="4" y="7" width="16" height="10" />
          <path d="M4 10.33h16M4 13.67h16" />
        </svg>
      );
    case 'usa':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
          strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="4" y="6" width="16" height="12" />
          <path d="M4 9h16M4 12h16M4 15h16" />
          <rect x="4" y="6" width="8" height="6" />
        </svg>
      );
    case 'uk':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
          strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="6" width="18" height="12" />
          <path d="M3 12h18M12 6v12" />
          <path d="M3 6l9 6 9-6M3 18l9-6 9 6" />
        </svg>
      );
    default:
      return <Globe className={className} />;
  }
};

// Subtle accent gradient per country / terminal
const TERMINAL_ACCENTS: Record<string, { from: string; badge: string }> = {
  iran:    { from: '#10b98118', badge: '#10b981' },
  india:   { from: '#f9731618', badge: '#f97316' },
  turkey:  { from: '#ef444418', badge: '#ef4444' },
  uae:     { from: '#eab30818', badge: '#eab308' },
  oman:    { from: '#22c55e18', badge: '#22c55e' },
  china:   { from: '#dc262618', badge: '#dc2626' },
  vietnam: { from: '#f5913218', badge: '#f59132' },
  germany: { from: '#f0a00018', badge: '#f0a000' },
  usa:     { from: '#3b82f618', badge: '#3b82f6' },
  uk:      { from: '#cf142b18', badge: '#cf142b' },
};

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut', delay } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
});
// slideUp only used for level containers (l1, l2, l3) — not nested inside another animated parent
const slideUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94], delay } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
});

// ── Component ───────────────────────────────────────────────────────────────

export default function App() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const { exportData, syncMode, remoteReady, rootNodeLines, setRootNodeLines, adminOk } = useExportData();

  const [level, setLevel] = useState<AppLevel>(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState({ line1: '', line2: '', badge: '', subtitle: '', stat1: '', stat2: '', stat3: '' });
  const titleModalOpenRef = useRef(false);
  titleModalOpenRef.current = titleModalOpen;

  // ── Navigation ────────────────────────────────────────────────────────────

  const goBack = useCallback(() => {
    if (level === 3) { setLevel(2); setSelectedCategory(null); }
    else if (level === 2) { setLevel(1); setSelectedCountry(null); }
    else if (level === 1) { setLevel(0); }
  }, [level]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (titleModalOpenRef.current) { setTitleModalOpen(false); return; }
      goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goBack]);

  useEffect(() => { window.scrollTo(0, 0); }, [level]);

  // ── Data ──────────────────────────────────────────────────────────────────

  const countries = useMemo(() => (Object.values(exportData) as Country[]).filter((c) => !c.hidden), [exportData]);
  const selectedCountryData = selectedCountry ? exportData[selectedCountry] : undefined;

  const categories = useMemo(() => {
    if (!selectedCountryData) return [];
    return (Object.entries(selectedCountryData.categories) as [string, Category][])
      .filter(([, cat]) => !cat.hidden)
      .map(([id, cat]) => ({ id, label: cat.label, icon: cat.icon, companies: cat.companies }));
  }, [selectedCountryData]);

  const companies = useMemo(() => {
    if (!selectedCountryData || !selectedCategory) return [];
    const cat = selectedCountryData.categories[selectedCategory];
    if (!cat || cat.hidden) return [];
    return cat.companies;
  }, [selectedCountryData, selectedCategory]);

  useEffect(() => {
    if (selectedCountry && !exportData[selectedCountry]) {
      setSelectedCountry(null);
      setSelectedCategory(null);
      setLevel(1);
      return;
    }
    if (!selectedCountryData || !selectedCategory) return;
    const cat = selectedCountryData.categories[selectedCategory];
    if (!cat || cat.hidden) {
      setSelectedCategory(null);
      if (level === 3) setLevel(2);
    }
  }, [exportData, level, selectedCountry, selectedCategory, selectedCountryData]);

  const rootLine1 = useMemo(
    () => rootNodeLines.line1.trim() || DEFAULT_ROOT_NODE_LINES.line1,
    [rootNodeLines.line1],
  );
  const rootLine2 = useMemo(
    () => rootNodeLines.line2.trim() || DEFAULT_ROOT_NODE_LINES.line2,
    [rootNodeLines.line2],
  );

  const totalBooths = useMemo(
    () => countries.reduce((n, c) => n + (Object.values(c.categories) as Category[]).filter((cat) => !cat.hidden).length, 0),
    [countries],
  );
  const totalVendors = useMemo(
    () => countries.reduce(
      (n, c) => n + (Object.values(c.categories) as Category[]).reduce((m, cat) => (cat.hidden ? m : m + cat.companies.length), 0), 0,
    ),
    [countries],
  );

  const heroBadge    = rootNodeLines.badge?.trim()    || DEFAULT_ROOT_NODE_LINES.badge!;
  const heroSubtitle = rootNodeLines.subtitle?.trim() || DEFAULT_ROOT_NODE_LINES.subtitle!;
  const heroStat1    = rootNodeLines.stat1?.trim()    || DEFAULT_ROOT_NODE_LINES.stat1!;
  const heroStat2    = rootNodeLines.stat2?.trim()    || DEFAULT_ROOT_NODE_LINES.stat2!;
  const heroStat3    = rootNodeLines.stat3?.trim()    || DEFAULT_ROOT_NODE_LINES.stat3!;

  const openTitleModal = useCallback(() => {
    setTitleDraft({
      line1: rootLine1,
      line2: rootLine2,
      badge:    rootNodeLines.badge?.trim()    ?? DEFAULT_ROOT_NODE_LINES.badge    ?? '',
      subtitle: rootNodeLines.subtitle?.trim() ?? DEFAULT_ROOT_NODE_LINES.subtitle ?? '',
      stat1:    rootNodeLines.stat1?.trim()    ?? DEFAULT_ROOT_NODE_LINES.stat1    ?? '',
      stat2:    rootNodeLines.stat2?.trim()    ?? DEFAULT_ROOT_NODE_LINES.stat2    ?? '',
      stat3:    rootNodeLines.stat3?.trim()    ?? DEFAULT_ROOT_NODE_LINES.stat3    ?? '',
    });
    setTitleModalOpen(true);
  }, [rootLine1, rootLine2, rootNodeLines]);

  // ── Scroll-vs-tap detection ───────────────────────────────────────────────
  // Tracks whether the current touch gesture has moved significantly.
  // Cards check this ref in onClick so a scroll that lifts over a card
  // does NOT trigger navigation.
  const touchStartYRef = useRef(0);
  const touchScrolledRef = useRef(false);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
      touchScrolledRef.current = false;
    };
    const onMove = (e: TouchEvent) => {
      if (Math.abs(e.touches[0].clientY - touchStartYRef.current) > 8) {
        touchScrolledRef.current = true;
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-port-bg text-port-ink font-sans flex flex-col overflow-x-hidden select-none">

      {/* Sync bar */}
      {syncMode === 'firebase' && !remoteReady && (
        <div className="fixed top-0 inset-x-0 z-[100] h-0.5 overflow-hidden">
          <div className="h-full w-1/3 bg-port-accent/50 animate-pulse" />
        </div>
      )}

      <SeoHead />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 h-16 port-glass-nav border-b border-port-border px-4 sm:px-8 flex items-center relative">

        {/* Left: Logo or Back */}
        <div className="flex items-center gap-3 shrink-0 z-10">
          {level === 0 ? (
            <Link to="/" className="flex items-center gap-2.5 port-header-fade">
              <div className="w-8 h-8 rounded-full border border-port-accent/40 bg-port-accent-bg flex items-center justify-center shrink-0">
                <span className="font-serif text-port-accent text-base leading-none">T</span>
              </div>
              <div className="hidden sm:flex flex-col leading-none gap-0.5">
                <span className="font-semibold text-[13px] tracking-tight text-port-ink leading-none">Tohid Dayhami</span>
                <span className="text-[10px] text-port-soft tracking-wide leading-none hidden md:block">Business Solutions Center</span>
              </div>
            </Link>
          ) : (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-port-border hover:border-port-border-hi hover:bg-port-surface transition-all group port-header-fade"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium">{t('back')}</span>
            </button>
          )}
        </div>

        {/* Center: absolutely centered so it's always truly centered */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {level === 0 ? (
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
          ) : (
            <div className="pointer-events-auto hidden sm:flex items-center gap-1.5 text-[12px] text-port-soft">
              <span className="text-port-ink font-medium shrink-0">Tohid Meta Port</span>
              {level >= 1 && <span className="text-port-faint shrink-0">/</span>}
              {level >= 1 && (
                <span className="truncate shrink-0">
                  {level === 1 ? 'Terminals' : exportData[selectedCountry!]?.label}
                </span>
              )}
              {level >= 2 && <span className="text-port-faint shrink-0">/</span>}
              {level >= 2 && (
                <span className="truncate">
                  {level === 2
                    ? 'Booths'
                    : exportData[selectedCountry!]?.categories[selectedCategory!]?.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0 z-10 ml-auto">
          <Link
            to="/admin"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-port-surface border border-transparent hover:border-port-border transition-all text-port-soft hover:text-port-ink"
            aria-label={t('ariaAdmin')}
          >
            <Settings2 className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <button
            type="button"
            className="w-9 h-9 rounded-full hidden sm:flex items-center justify-center hover:bg-port-surface border border-transparent hover:border-port-border transition-all text-port-soft hover:text-port-ink"
            aria-label={t('ariaSearch')}
          >
            <Search className="w-4 h-4" strokeWidth={1.5} />
          </button>
          {/* Mobile menu button — only on level 0 */}
          {level === 0 && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="sm:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-port-surface border border-transparent hover:border-port-border transition-all text-port-soft hover:text-port-ink"
              aria-label={t('ariaMenu')}
            >
              {mobileMenuOpen
                ? <X className="w-4 h-4" strokeWidth={1.5} />
                : <Menu className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          )}
        </div>
      </header>

      {/* Mobile dropdown nav */}
      {mobileMenuOpen && level === 0 && (
        <div className="sm:hidden fixed top-16 inset-x-0 z-40 port-glass-nav border-b border-port-border shadow-lg">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
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

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 relative">
        {/* Grid texture */}
        <div className="fixed inset-0 port-grid pointer-events-none z-0" />

        <AnimatePresence mode="wait">

          {/* ── Level 0 — Port Entrance ────────────────────────────────────── */}
          {level === 0 && (
            <motion.div
              key="l0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="relative z-10 min-h-[calc(100dvh-64px)] flex flex-col items-center justify-center px-6 py-24 overflow-hidden"
            >
              {/* Ambient orbs — smaller blur on mobile to reduce GPU work */}
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-port-accent/[0.04] blur-[60px] sm:blur-[120px] pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-port-gold/[0.04] blur-[40px] sm:blur-[80px] pointer-events-none" />

              {/* Scan line */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-port-accent/20 to-transparent port-scan pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full">

                {/* Badge */}
                <motion.div {...fadeIn(0.05)}>
                  <div className="mb-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-port-accent/25 bg-port-accent-bg text-port-accent text-[11px] font-medium tracking-[0.18em] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-port-accent animate-pulse" />
                    {heroBadge}
                  </div>
                </motion.div>

                {/* Title */}
                <motion.div {...fadeIn(0.1)}>
                  <h1 className="font-serif leading-[0.88] tracking-tight mb-2">
                    <span className="block text-[clamp(3.5rem,12vw,7rem)] text-port-ink">{rootLine1}</span>
                    <span className="block text-[clamp(3.5rem,12vw,7rem)] text-port-accent">{rootLine2}</span>
                  </h1>
                </motion.div>

                {/* Subtitle */}
                <motion.p {...fadeIn(0.16)} className="text-port-soft text-[15px] sm:text-base max-w-sm mt-6 mb-10 leading-relaxed">
                  {heroSubtitle}
                </motion.p>

                {/* Stats */}
                <motion.div {...fadeIn(0.22)} className="flex items-center gap-8 mb-12">
                  {[
                    { value: countries.length, label: heroStat1 },
                    { value: totalBooths,       label: heroStat2 },
                    { value: totalVendors,      label: heroStat3 },
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="font-serif text-2xl text-port-ink">{s.value}</span>
                      <span className="text-[11px] text-port-soft tracking-wide">{s.label}</span>
                    </div>
                  ))}
                </motion.div>

                {/* Enter CTA */}
                <motion.div {...fadeIn(0.28)} className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setLevel(1)}
                    className="port-enter-btn group flex items-center gap-2.5 px-8 py-4 min-h-[52px] rounded-full bg-port-accent text-port-bg font-semibold text-[15px] tracking-wide hover:bg-port-accent/90 active:opacity-80 transition-opacity"
                  >
                    Enter Port
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {adminOk && (
                    <button
                      type="button"
                      onClick={openTitleModal}
                      className="flex items-center gap-1.5 text-[11px] text-port-faint hover:text-port-soft transition-colors mt-1"
                    >
                      <Pencil className="w-3 h-3" strokeWidth={2} />
                      Edit title
                    </button>
                  )}
                </motion.div>
              </div>

              {/* Scroll indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-port-faint pointer-events-none"
              >
                <div className="w-px h-10 bg-gradient-to-b from-transparent to-port-faint/40" />
                <span className="text-[9px] tracking-[0.2em] uppercase">Scroll</span>
              </motion.div>
            </motion.div>
          )}

          {/* ── Level 1 — Country Terminals ───────────────────────────────── */}
          {level === 1 && (
            <motion.div key="l1" {...slideUp()} className="relative z-10 px-4 sm:px-8 py-10 max-w-6xl mx-auto">

              <div className="mb-8">
                <p className="text-port-soft text-xs tracking-[0.16em] uppercase mb-2">Tohid Meta Port</p>
                <h2 className="font-serif text-3xl sm:text-4xl text-port-ink">Port Terminals</h2>
                <p className="text-port-soft text-sm mt-2">Select a terminal to explore its trade booths</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {countries.map((c, i) => {
                  const accent = TERMINAL_ACCENTS[c.flag || c.id] ?? TERMINAL_ACCENTS.iran;
                  const visibleBoothCount = (Object.values(c.categories) as Category[]).filter((cat) => !cat.hidden).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { if (!touchScrolledRef.current) { setSelectedCountry(c.id); setLevel(2); } }}
                      className="group relative flex flex-col p-5 sm:p-6 rounded-2xl border border-port-border hover:border-port-border-hi port-card-glow transition-colors text-left active:opacity-70 overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${accent.from} 0%, transparent 60%), #0e0e1c` }}
                    >
                      {/* Terminal ID badge */}
                      <div
                        className="absolute top-3 end-3 px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wider uppercase opacity-60"
                        style={{ color: accent.badge, background: `${accent.badge}18` }}
                      >
                        T-{String(i + 1).padStart(2, '0')}
                      </div>

                      {/* Flag icon */}
                      <div
                        className="w-12 h-12 rounded-xl border flex items-center justify-center mb-5 transition-all group-hover:scale-105"
                        style={{
                          background: `${accent.badge}14`,
                          borderColor: `${accent.badge}30`,
                          color: accent.badge,
                        }}
                      >
                        <FlagIcon id={c.flag || c.id} className="w-6 h-6" />
                      </div>

                      <h3 className="font-semibold text-[15px] text-port-ink mb-1 group-hover:text-port-accent transition-colors">
                        {c.label}
                      </h3>
                      <p className="text-[11px] text-port-soft">
                        {visibleBoothCount} {visibleBoothCount === 1 ? 'booth' : 'booths'}
                      </p>

                      {/* Arrow */}
                      <div className="absolute bottom-5 end-5 text-port-faint group-hover:text-port-accent group-hover:translate-x-0.5 transition-all rtl:rotate-180">
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </div>

                      {/* Bottom glow line */}
                      <div
                        className="absolute inset-x-0 bottom-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: `linear-gradient(90deg, transparent, ${accent.badge}60, transparent)` }}
                      />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Level 2 — Category Booths ──────────────────────────────────── */}
          {level === 2 && selectedCountry && (
            <motion.div key="l2" {...slideUp()} className="relative z-10 px-4 sm:px-8 py-10 max-w-6xl mx-auto">

              {/* Terminal header */}
              <div className="flex items-center gap-4 mb-10 pb-8 border-b border-port-border">
                {(() => {
                  const accent = TERMINAL_ACCENTS[exportData[selectedCountry].flag || selectedCountry] ?? TERMINAL_ACCENTS.iran;
                  return (
                    <div
                      className="w-16 h-16 rounded-2xl border flex items-center justify-center shrink-0"
                      style={{ background: `${accent.badge}14`, borderColor: `${accent.badge}30`, color: accent.badge }}
                    >
                      <FlagIcon id={exportData[selectedCountry].flag || selectedCountry} className="w-8 h-8" />
                    </div>
                  );
                })()}
                <div>
                  <p className="text-port-soft text-xs tracking-[0.14em] uppercase mb-1">Terminal</p>
                  <h2 className="font-serif text-3xl sm:text-4xl text-port-ink">{exportData[selectedCountry].label}</h2>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-port-soft text-sm font-medium tracking-wide">Trade Booths</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {categories.map((cat, i) => {
                  const Icon = cat.icon as LucideIcon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { if (!touchScrolledRef.current) { setSelectedCategory(cat.id); setLevel(3); } }}
                      className="group relative flex flex-col p-5 rounded-2xl border border-port-border bg-port-surface hover:border-port-accent/30 port-card-glow transition-colors text-left active:opacity-70 overflow-hidden"
                    >
                      {/* Booth number */}
                      <div className="absolute top-3 end-3 text-[9px] text-port-faint tracking-widest font-medium">
                        B{String(i + 1).padStart(2, '0')}
                      </div>

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-port-accent-bg border border-port-accent-border flex items-center justify-center text-port-accent mb-4 group-hover:bg-port-accent/20 group-hover:scale-105 transition-all shrink-0">
                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>

                      <h3 className="font-medium text-[13px] text-port-ink leading-snug mb-1.5 group-hover:text-port-accent transition-colors">
                        {cat.label}
                      </h3>
                      <p className="text-[11px] text-port-soft">{cat.companies.length} vendors</p>

                      {/* Hover line */}
                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-port-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Level 3 — Vendor Cards ─────────────────────────────────────── */}
          {level === 3 && selectedCountry && selectedCategory && (
            <motion.div key="l3" {...slideUp()} className="relative z-10 px-4 sm:px-8 py-10 max-w-4xl mx-auto">

              {/* Booth header */}
              <div className="flex items-center gap-3 mb-2">
                {(() => {
                  const Icon = exportData[selectedCountry].categories[selectedCategory].icon as LucideIcon;
                  return (
                    <div className="w-10 h-10 rounded-xl bg-port-accent-bg border border-port-accent-border flex items-center justify-center text-port-accent shrink-0">
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                  );
                })()}
                <h2 className="font-serif text-2xl sm:text-3xl text-port-ink">
                  {exportData[selectedCountry].categories[selectedCategory].label}
                </h2>
              </div>
              <p className="text-port-soft text-sm mb-10 ps-[52px]">
                {exportData[selectedCountry].label} · {companies.length} vendors
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companies.map((comp, i) => (
                  <a
                    key={`${comp.name}-${i}`}
                    href={comp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 p-5 rounded-2xl border border-port-border bg-port-surface hover:border-port-accent/30 port-card-glow transition-colors active:opacity-70"
                  >
                    {/* Initial */}
                    <div className="w-12 h-12 shrink-0 rounded-xl border border-port-border bg-port-surface flex items-center justify-center group-hover:bg-port-accent-bg group-hover:border-port-accent-border transition-all">
                      <span className="font-serif text-xl text-port-ink group-hover:text-port-accent transition-colors">
                        {comp.initial}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] text-port-ink group-hover:text-port-accent transition-colors truncate">
                        {comp.name}
                      </div>
                      <div className="text-[12px] text-port-soft mt-0.5 truncate">{comp.tag}</div>
                    </div>

                    {/* External link */}
                    <ExternalLink
                      className="w-4 h-4 text-port-faint group-hover:text-port-accent shrink-0 transition-all group-hover:scale-110"
                      strokeWidth={1.5}
                    />
                  </a>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Root Title Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {titleModalOpen && (
          <motion.div
            key="title-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onPointerDown={(e) => { if (e.target === e.currentTarget) setTitleModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 360 }}
              className="relative w-full max-w-sm rounded-2xl border border-port-border bg-port-surface p-6 shadow-2xl"
              dir="auto"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute end-3 top-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-port-border text-port-soft hover:text-port-ink transition-all"
                onClick={() => setTitleModalOpen(false)}
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>

              <h3 className="font-serif text-lg text-port-ink pe-10">{t('editMapCenterTitle')}</h3>
              <p className="mt-1 text-[11px] text-port-soft leading-snug">{t('rootMapTitleHint')}</p>

              <div className="mt-5 max-h-[55vh] overflow-y-auto space-y-5 pr-1">

                {/* Title section */}
                <div className="space-y-3">
                  <span className="text-[10px] text-port-faint uppercase tracking-wider">{t('rootMapTitleSection')}</span>
                  {(['line1', 'line2'] as const).map((key) => (
                    <label key={key} className="block text-xs">
                      <span className="text-port-soft">{t(key === 'line1' ? 'rootMapTitleLine1' : 'rootMapTitleLine2')}</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-port-border bg-port-bg px-3 py-2 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                        value={titleDraft[key]}
                        onChange={(e) => setTitleDraft((d) => ({ ...d, [key]: e.target.value }))}
                        maxLength={80}
                      />
                    </label>
                  ))}
                </div>

                {/* Hero texts section */}
                <div className="space-y-3 pt-4 border-t border-port-border">
                  <span className="text-[10px] text-port-faint uppercase tracking-wider">{t('heroTextsSection')}</span>
                  {(['badge', 'subtitle'] as const).map((key) => (
                    <label key={key} className="block text-xs">
                      <span className="text-port-soft">{t(key === 'badge' ? 'heroTextsBadge' : 'heroTextsSubtitle')}</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-port-border bg-port-bg px-3 py-2 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                        value={titleDraft[key]}
                        onChange={(e) => setTitleDraft((d) => ({ ...d, [key]: e.target.value }))}
                        maxLength={120}
                      />
                    </label>
                  ))}
                </div>

                {/* Stat labels section */}
                <div className="space-y-3 pt-4 border-t border-port-border">
                  <span className="text-[10px] text-port-faint uppercase tracking-wider">{t('statLabelsSection')}</span>
                  {(['stat1', 'stat2', 'stat3'] as const).map((key) => (
                    <label key={key} className="block text-xs">
                      <span className="text-port-soft">
                        {t(key === 'stat1' ? 'heroStat1Label' : key === 'stat2' ? 'heroStat2Label' : 'heroStat3Label')}
                      </span>
                      <input
                        className="mt-1 w-full rounded-lg border border-port-border bg-port-bg px-3 py-2 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                        value={titleDraft[key]}
                        onChange={(e) => setTitleDraft((d) => ({ ...d, [key]: e.target.value }))}
                        maxLength={40}
                      />
                    </label>
                  ))}
                </div>

              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-port-border px-4 py-2 text-sm text-port-soft hover:bg-port-border transition-all"
                  onClick={() => setTitleModalOpen(false)}
                >
                  {t('mapCenterTitleCancel')}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-port-accent px-4 py-2 text-sm font-semibold text-port-bg hover:opacity-90 active:scale-[0.97] transition-all"
                  onClick={() => {
                    setRootNodeLines({
                      line1:    titleDraft.line1.trim(),
                      line2:    titleDraft.line2.trim(),
                      badge:    titleDraft.badge.trim()    || undefined,
                      subtitle: titleDraft.subtitle.trim() || undefined,
                      stat1:    titleDraft.stat1.trim()    || undefined,
                      stat2:    titleDraft.stat2.trim()    || undefined,
                      stat3:    titleDraft.stat3.trim()    || undefined,
                      faviconHref: rootNodeLines.faviconHref,
                    });
                    setTitleModalOpen(false);
                  }}
                >
                  {t('mapCenterTitleSave')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
