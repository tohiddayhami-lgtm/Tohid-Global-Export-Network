/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Search, Menu, ArrowLeft, Globe, LocateFixed, Settings2, Loader2, Radio, WifiOff, AlertCircle, type LucideIcon } from 'lucide-react';
import { useExportData, type NetworkSyncStatus } from './networkContext.tsx';
import type { Category } from './hydrateNetwork.ts';

const VIEW_MIN_ZOOM = 0.4;
const VIEW_MAX_ZOOM = 3.5;

// --- Types ---
type AppLevel = 0 | 1 | 2 | 3;

// --- Helpers ---
/**
 * Places `count` nodes on an arc of radius `radius` around `pivot`.
 * The arc opens along `atan2(pivot.y, pivot.x)` (away from global center) unless `fromPoint`
 * is set; then it opens along `pivot - fromPoint` (e.g. outward from a category node when
 * `pivot` is a ring center offset past the category).
 */
function getFanPositions(
  count: number,
  pivot: { x: number; y: number },
  radius: number,
  spreadDegrees: number,
  fromPoint?: { x: number; y: number }
) {
  const anchorAngle = fromPoint
    ? Math.atan2(pivot.y - fromPoint.y, pivot.x - fromPoint.x)
    : Math.atan2(pivot.y, pivot.x);
  const spread = (spreadDegrees * Math.PI) / 180;
  const startAngle = anchorAngle - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;

  return Array.from({ length: count }, (_, i) => {
    const angle = count === 1 ? anchorAngle : startAngle + step * i;
    return {
      x: pivot.x + Math.cos(angle) * radius,
      y: pivot.y + Math.sin(angle) * radius
    };
  });
}

/**
 * Category nodes around a country: wider arc + larger radius as count grows;
 * splits into two staggered rings when there are many categories (e.g. 14) to reduce overlap.
 */
function getCategoryLayoutPositions(
  count: number,
  anchor: { x: number; y: number },
  graphScale: number
): { x: number; y: number }[] {
  if (count <= 0) return [];
  if (count === 1) {
    return getFanPositions(1, anchor, 215 * graphScale, 120);
  }

  const minSepDeg = count > 14 ? 21 : count > 10 ? 24 : count > 6 ? 28 : 32;
  const maxSingleRing = 8;

  if (count <= maxSingleRing) {
    const spread = Math.min(352, Math.max(132, (count - 1) * minSepDeg + 40));
    const r = graphScale * Math.min(465, Math.max(186, 200 + count * 12));
    return getFanPositions(count, anchor, r, spread);
  }

  const nInner = Math.ceil(count / 2);
  const nOuter = count - nInner;
  const spreadIn = Math.min(328, Math.max(128, (nInner - 1) * minSepDeg + 36));
  const spreadOut = Math.min(328, Math.max(128, (nOuter - 1) * minSepDeg + 36));
  const rInner = graphScale * Math.min(410, 192 + nInner * 10);
  const rOuter = graphScale * Math.min(485, 268 + nOuter * 11);
  const inner = getFanPositions(nInner, anchor, rInner, spreadIn);
  const outer = getFanPositions(nOuter, anchor, rOuter, spreadOut);
  const offsetRad =
    nInner > 1 ? ((spreadIn * Math.PI) / 180 / (nInner - 1)) * 0.5 : (14 * Math.PI) / 180;
  const cos = Math.cos(offsetRad);
  const sin = Math.sin(offsetRad);
  const outerStaggered = outer.map((p) => {
    const dx = p.x - anchor.x;
    const dy = p.y - anchor.y;
    return {
      x: anchor.x + dx * cos - dy * sin,
      y: anchor.y + dx * sin + dy * cos,
    };
  });
  return [...inner, ...outerStaggered];
}

/** Layout reference (px) — graph coordinates in constants.ts assume ~this viewport; scale down on smaller screens. */
const GRAPH_BASE_W = 880;
const GRAPH_BASE_H = 600;

// --- Components ---

const FlagIcon = ({ id, active }: { id: string, active: boolean }) => {
  const color = active ? 'white' : 'currentColor';
  
  switch (id) {
    case 'iran':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" className="w-6 h-6">
          <path d="M4 8h16M4 12h16M4 16h16" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'india':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" className="w-6 h-6">
          <path d="M4 8h16M4 16h16" />
          <circle cx="12" cy="12" r="2" />
          <path d="M12 10v4M10 12h4" />
        </svg>
      );
    case 'turkey':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" className="w-6 h-6">
          <path d="M12 8a4 4 0 1 0 0 8 4.2 4.2 0 0 1 0-8" />
          <path d="M15 11l1 1-1 1M17 12l0.2 0" />
        </svg>
      );
    case 'uae':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" className="w-6 h-6">
          <path d="M4 6v12M4 6h4v12H4zM8 6h12M8 12h12M8 18h12" />
        </svg>
      );
    case 'china':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" className="w-6 h-6">
          <path d="M6 7l1 2-1.5-1.5zM9 6l0.5 1M9 9l0.5-1M11 7l-1 0.5" />
          <path d="M4 4h16v16H4z" />
        </svg>
      );
    case 'vietnam':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" className="w-6 h-6">
          <path d="M12 6l1.5 4.5H18l-3.5 2.5 1.5 4.5-4-2.5-4 2.5 1.5-4.5L5 10.5h4.5z" />
        </svg>
      );
    default:
      return <Globe className="w-6 h-6" />;
  }
};

function NetworkSyncPill({ status }: { status: NetworkSyncStatus }) {
  const base =
    'inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-ink-soft shrink-0';
  if (status === 'local_only') {
    return (
      <span
        className={base}
        title="Firebase is not configured — data is stored only on this browser unless you add VITE_FIREBASE_* to .env"
      >
        <WifiOff className="w-3 h-3 shrink-0" strokeWidth={2} />
        Local
      </span>
    );
  }
  if (status === 'connecting') {
    return (
      <span className={base} title="Connecting to cloud storage…">
        <Loader2 className="w-3 h-3 shrink-0 animate-spin" strokeWidth={2} />
        Sync…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        className={`${base} border-red-200 text-red-700 bg-red-50/80`}
        title="Cloud sync failed — enable Firestore in Firebase Console and deploy security rules"
      >
        <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={2} />
        Sync error
      </span>
    );
  }
  return (
    <span className={`${base} border-emerald-200 text-emerald-800 bg-emerald-50/80`} title="Edits from the admin panel sync to all open devices">
      <Radio className="w-3 h-3 shrink-0 text-emerald-600" strokeWidth={2} />
      Live
    </span>
  );
}

export default function App() {
  const { exportData, networkSyncStatus } = useExportData();
  const [level, setLevel] = useState<AppLevel>(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  const [viewZoom, setViewZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef({ pan: { x: 0, y: 0 }, zoom: 1 });
  const panDragRef = useRef({
    active: false,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    originPanX: 0,
    originPanY: 0,
  });
  const pinchRef = useRef<{ dist0: number; zoom0: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : GRAPH_BASE_W,
    height: typeof window !== 'undefined' ? Math.max(320, window.innerHeight - 80) : GRAPH_BASE_H,
  }));

  const graphScale = useMemo(() => {
    const w = canvasSize.width;
    const h = canvasSize.height;
    if (w < 1 || h < 1) return 1;
    return Math.min(1, w / GRAPH_BASE_W, h / GRAPH_BASE_H);
  }, [canvasSize.width, canvasSize.height]);

  const scaleXY = useCallback(
    (p: { x: number; y: number }) => ({ x: p.x * graphScale, y: p.y * graphScale }),
    [graphScale]
  );

  // Update canvas size for layout scale + SVG mapping
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const updateSize = () => {
      setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => {
      window.removeEventListener('resize', updateSize);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    viewRef.current = { pan: viewPan, zoom: viewZoom };
  }, [viewPan, viewZoom]);

  useEffect(() => {
    if (level === 0) {
      setViewPan({ x: 0, y: 0 });
      setViewZoom(1);
    }
  }, [level]);

  const clampZoom = useCallback((z: number) => Math.min(VIEW_MAX_ZOOM, Math.max(VIEW_MIN_ZOOM, z)), []);

  const onPanHitPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const d = panDragRef.current;
    d.active = true;
    d.pointerId = e.pointerId;
    d.startClientX = e.clientX;
    d.startClientY = e.clientY;
    d.originPanX = viewPan.x;
    d.originPanY = viewPan.y;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [viewPan.x, viewPan.y]);

  const onPanHitPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = panDragRef.current;
    if (!d.active || e.pointerId !== d.pointerId) return;
    setViewPan({
      x: d.originPanX + (e.clientX - d.startClientX),
      y: d.originPanY + (e.clientY - d.startClientY),
    });
  }, []);

  const onPanHitPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = panDragRef.current;
    if (!d.active || e.pointerId !== d.pointerId) return;
    d.active = false;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const sx = e.clientX - cx;
      const sy = e.clientY - cy;
      const { pan, zoom } = viewRef.current;
      const wx = (sx - pan.x) / zoom;
      const wy = (sy - pan.y) / zoom;
      const factor = Math.exp(-e.deltaY * 0.0012);
      const z2 = clampZoom(zoom * factor);
      setViewZoom(z2);
      setViewPan({ x: sx - wx * z2, y: sy - wy * z2 });
    };

    el.addEventListener('wheel', wheelHandler, { passive: false });

    const touchDist = (t: TouchList) => {
      const a = t[0];
      const b = t[1];
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = { dist0: touchDist(e.touches), zoom0: viewRef.current.zoom };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && pinchRef.current) {
        e.preventDefault();
        const d = touchDist(e.touches);
        if (pinchRef.current.dist0 < 1) return;
        const z2 = clampZoom(pinchRef.current.zoom0 * (d / pinchRef.current.dist0));
        setViewZoom(z2);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('wheel', wheelHandler);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [clampZoom]);

  const handleBack = useCallback(() => {
    if (level === 3) {
      setLevel(2);
      setSelectedCategory(null);
    } else if (level === 2) {
      setLevel(1);
      setSelectedCountry(null);
    } else if (level === 1) {
      setLevel(0);
    }
  }, [level]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack]);

  const countries = useMemo(() => Object.values(exportData), [exportData]);
  
  const categories = useMemo(() => {
    if (!selectedCountry) return [];
    const country = exportData[selectedCountry];
    const catList = (Object.entries(country.categories) as [string, Category][]).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    const anchor = scaleXY(country.anchor);
    const positions = getCategoryLayoutPositions(catList.length, anchor, graphScale);
    return catList.map(([id, cat], i) => ({
      id,
      label: cat.label,
      icon: cat.icon,
      companies: cat.companies,
      pos: positions[i],
    }));
  }, [selectedCountry, graphScale, scaleXY, exportData]);

  const companies = useMemo(() => {
    if (!selectedCountry || !selectedCategory) return [];
    const category = exportData[selectedCountry].categories[selectedCategory];
    const catPos = categories.find(c => c.id === selectedCategory)?.pos || { x: 0, y: 0 };
    const countryPivot = scaleXY(exportData[selectedCountry].anchor);
    const n = category.companies.length;

    const vx = catPos.x - countryPivot.x;
    const vy = catPos.y - countryPivot.y;
    const vlen = Math.hypot(vx, vy) || 1;
    const ux = vx / vlen;
    const uy = vy / vlen;

    const ringGap = graphScale * 36;
    const layoutPivot = { x: catPos.x + ux * ringGap, y: catPos.y + uy * ringGap };

    const spreadDeg = Math.min(136, Math.max(96, 28 * n + 58));
    const radius = graphScale * Math.min(340, Math.max(175, 62 + n * 36));

    const positions = getFanPositions(n, layoutPivot, radius, spreadDeg, catPos);
    return category.companies.map((comp, i) => ({ ...comp, pos: positions[i] }));
  }, [selectedCountry, selectedCategory, categories, graphScale, scaleXY, exportData]);

  // Coordinate mapper for SVG
  const toSVG = (x: number, y: number) => {
    return {
      x: 500 + x,
      y: 350 + y
    };
  };

  const breadcrumb = useMemo(() => {
    if (level === 0) return 'Discover / Countries';
    if (level === 1) return 'Discover / Countries';
    if (level === 2) return `Discover / ${exportData[selectedCountry!].label}`;
    if (level === 3) return `Discover / ${exportData[selectedCountry!].label} / ${exportData[selectedCountry!].categories[selectedCategory!].label}`;
    return 'Discover';
  }, [level, selectedCountry, selectedCategory, exportData]);

  return (
    <div className="min-h-[100dvh] min-h-screen bg-bg flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 min-h-[60px] sm:h-[72px] py-2 sm:py-0 blur-nav border-b border-black/5 px-3 sm:px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-1 sm:gap-0 sm:justify-between relative">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 shrink-0 rounded-full bg-ink flex items-center justify-center">
              <span className="text-white font-serif text-lg leading-none mt-0.5">G</span>
            </div>
            <span className="font-semibold text-[14px] sm:text-[15px] tracking-tight truncate max-w-[min(200px,52vw)] sm:max-w-none sm:hidden">Global Export Network</span>
            <span className="font-semibold text-[15px] tracking-tight hidden sm:inline">Global Export Network</span>
            <NetworkSyncPill status={networkSyncStatus} />
          </div>
          <div className="flex items-center gap-2 sm:hidden shrink-0">
            <Link
              to="/admin"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-hover active:scale-95 touch-manipulation text-ink"
              aria-label="Admin"
            >
              <Settings2 className="w-[18px] h-[18px]" strokeWidth={2} />
            </Link>
            <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-hover active:scale-95 touch-manipulation" aria-label="Search">
              <Search className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-hover active:scale-95 touch-manipulation" aria-label="Menu">
              <Menu className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="hidden sm:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[min(420px,46vw)] px-2">
          <span className="text-ink-soft text-[12px] sm:text-[13px] font-medium tracking-tight line-clamp-1 block text-center">
            {breadcrumb}
          </span>
        </div>
        <p className="sm:hidden text-ink-soft text-[11px] font-medium tracking-tight truncate px-1 text-center leading-snug">
          {breadcrumb}
        </p>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Link
            to="/admin"
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors hover:bg-hover active:scale-95 touch-manipulation text-ink"
            aria-label="Admin"
          >
            <Settings2 className="w-[18px] h-[18px]" strokeWidth={2} />
          </Link>
          <button type="button" className="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors hover:bg-hover active:scale-95 touch-manipulation" aria-label="Search">
            <Search className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
          <button type="button" className="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors hover:bg-hover active:scale-95 touch-manipulation" aria-label="Menu">
            <Menu className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Main Stage */}
      <main ref={canvasRef} className="flex-1 min-h-0 relative overflow-hidden bg-bg">
        <div
          ref={viewportRef}
          className="absolute inset-0 z-0 overflow-hidden overscroll-none touch-none"
          aria-label="Mind map canvas"
        >
          <div
            className="absolute inset-0 dot-grid will-change-transform"
            style={{
              transform: `translate(${viewPan.x}px, ${viewPan.y}px) scale(${viewZoom})`,
              transformOrigin: '50% 50%',
            }}
          >
            <div
              className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={onPanHitPointerDown}
              onPointerMove={onPanHitPointerMove}
              onPointerUp={onPanHitPointerUp}
              onPointerCancel={onPanHitPointerUp}
            />
            {/* Background SVG Connections */}
            <svg className="absolute inset-0 z-[1] w-full h-full pointer-events-none" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <g className="connections">
                {/* Level 1 Lines (Root to Countries) */}
                {countries.map((c) => {
                  const start = toSVG(0, 0);
                  const a = scaleXY(c.anchor);
                  const end = toSVG(a.x, a.y);
                  const opacity = level === 1 ? 0.9 : (level === 2 ? 0.15 : 0.08);
                  return (
                    <motion.line
                      key={`line-l1-${c.id}`}
                      x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                      stroke="currentColor" strokeWidth={1.4} strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: level >= 1 ? 1 : 0, opacity: level >= 1 ? opacity : 0 }}
                      transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1], delay: 0.1 }}
                    />
                  );
                })}

                {/* Level 2 Lines (Country to Categories) */}
                {categories.map((cat) => {
                  const country = exportData[selectedCountry!];
                  const ca = scaleXY(country.anchor);
                  const start = toSVG(ca.x, ca.y);
                  const end = toSVG(cat.pos.x, cat.pos.y);
                  const opacity = level === 2 ? 0.9 : 0.3;
                  return (
                    <motion.line
                      key={`line-l2-${cat.id}`}
                      x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                      stroke="currentColor" strokeWidth={1.4} strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: level >= 2 ? 1 : 0, opacity: level >= 2 ? opacity : 0 }}
                      transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1], delay: 0.2 }}
                    />
                  );
                })}
              </g>
            </svg>

            {/* Level Titles */}
            <AnimatePresence>
              {level >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-20 sm:top-8 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center pointer-events-none px-4 max-w-[min(100%,22rem)] text-center"
                >
                  <h2 className="text-base leading-snug sm:text-xl md:text-2xl font-serif text-ink tracking-tight">
                    {selectedCountry && exportData[selectedCountry].label}
                    {level === 3 && selectedCategory && ` — ${exportData[selectedCountry].categories[selectedCategory].label}`}
                  </h2>
                  <div className="w-[30px] h-px bg-ink mt-2" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nodes Layer */}
            <div className="absolute inset-0 z-[3] flex items-center justify-center pointer-events-none">
              {/* Root Node */}
              <motion.button
                type="button"
                data-graph-node
                onClick={() => {
                  if (level === 0) setLevel(1);
                  else handleBack();
                }}
                whileHover={{ scale: level >= 2 ? 1.05 : 1.02 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  width: level >= 2 ? 80 : 140,
                  height: level >= 2 ? 80 : 140,
                  backgroundColor: level >= 1 ? "#1d1d1f" : "#ffffff",
                  color: level >= 1 ? "#ffffff" : "#1d1d1f",
                  opacity: (level >= 2) ? 0.5 : 1
                }}
                className="relative z-40 pointer-events-auto touch-manipulation rounded-full border-[1.5px] border-ink flex flex-col items-center justify-center transition-all duration-500 ease-in-out shadow-sm"
              >
                {level === 0 && <div className="absolute inset-0 rounded-full border border-ink pulse-ring pointer-events-none" />}
                <span className={`font-serif leading-tight ${level >= 2 ? 'text-lg' : 'text-xl'}`}>Global</span>
                <span className={`font-sans font-bold tracking-[0.2em] ${level >= 2 ? 'text-[8px]' : 'text-[10px]'} uppercase opacity-70`}>Export</span>
              </motion.button>

              {/* Level 1 Nodes (Countries) */}
              {countries.map((c, i) => (
                <AnimatePresence key={c.id}>
                  {level >= 1 && (
                    <motion.div
                      data-graph-node
                      initial={{ scale: 0.3, opacity: 0, x: 0, y: 0 }}
                      animate={{
                        scale: 1,
                        opacity: (level === 1 || selectedCountry === c.id) ? 1 : 0.2,
                        x: scaleXY(c.anchor).x,
                        y: scaleXY(c.anchor).y
                      }}
                      exit={{ scale: 0.3, opacity: 0 }}
                      transition={{
                        type: 'spring',
                        damping: 20,
                        stiffness: 150,
                        delay: level === 1 ? i * 0.07 : 0
                      }}
                      className="absolute z-30 flex flex-col items-center gap-2 group cursor-pointer pointer-events-auto touch-manipulation"
                      onClick={() => {
                        if (level === 1) {
                          setSelectedCountry(c.id);
                          setLevel(2);
                        } else if (level >= 2 && selectedCountry === c.id) {
                          handleBack();
                        }
                      }}
                    >
                      <motion.div
                        whileHover={{ y: -3 }}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-border flex items-center justify-center transition-all duration-300 ${selectedCountry === c.id || (level === 1 && false) ? 'bg-ink border-ink text-white' : 'bg-white group-hover:bg-hover'}`}
                      >
                        <FlagIcon id={c.id} active={selectedCountry === c.id} />
                      </motion.div>
                      <div className="flex flex-col items-center">
                        <span className="text-[14px] font-medium tracking-tight group-hover:text-ink">{c.label}</span>
                        <span className="text-[11px] text-ink-soft">{Object.keys(c.categories).length} Markets</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}

              {/* Level 2 Nodes (Categories) */}
              <AnimatePresence>
                {level >= 2 &&
                  categories.map((cat, i) => {
                    const Icon = cat.icon as LucideIcon;
                    const dense = categories.length > 10;
                    const stepDelay = dense ? Math.min(0.04, 0.5 / categories.length) : 0.08;
                    return (
                  <motion.div
                    key={cat.id}
                    data-graph-node
                    initial={{ scale: 0, opacity: 0, x: scaleXY(exportData[selectedCountry!].anchor).x, y: scaleXY(exportData[selectedCountry!].anchor).y }}
                    animate={{
                      scale: 1,
                      opacity: (level === 2 || selectedCategory === cat.id) ? 1 : 0.2,
                      x: cat.pos.x,
                      y: cat.pos.y
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      damping: dense ? 22 : 18,
                      stiffness: dense ? 140 : 120,
                      delay: level === 2 ? i * stepDelay : 0
                    }}
                    style={{ transformOrigin: dense ? '50% 20px' : '50% 22px' }}
                    className={`absolute z-20 flex flex-col items-center group cursor-pointer pointer-events-auto touch-manipulation ${dense ? 'gap-1' : 'gap-1.5'} sm:[transform-origin:50%_24px]`}
                    onClick={() => {
                      if (level === 2) {
                        setSelectedCategory(cat.id);
                        setLevel(3);
                      } else if (level === 3 && selectedCategory === cat.id) {
                        handleBack();
                      }
                    }}
                  >
                    <div className={`${dense ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-11 h-11 sm:w-[56px] sm:h-[56px]'} shrink-0 rounded-full border border-border flex items-center justify-center transition-all duration-300 ${selectedCategory === cat.id ? 'bg-ink border-ink text-white' : 'bg-white group-hover:bg-hover'}`}>
                      <Icon className={dense ? 'w-4 h-4 sm:w-[18px] sm:h-[18px]' : 'w-5 h-5 sm:w-6 sm:h-6'} strokeWidth={1.5} />
                    </div>
                    <div className={`flex flex-col items-center text-center ${dense ? 'max-w-[68px] sm:max-w-[76px]' : 'max-w-[80px]'}`}>
                      <span className={`${dense ? 'text-[10px] sm:text-[11px]' : 'text-[12px] sm:text-[13px]'} leading-tight font-medium tracking-tight`}>{cat.label}</span>
                    </div>
                  </motion.div>
                    );
                  })}
              </AnimatePresence>

              {/* Level 3 Nodes (Companies) */}
              <AnimatePresence>
                {level === 3 && companies.map((comp, i) => (
                  <motion.a
                    key={`${selectedCountry!}-${selectedCategory!}-${comp.name}`}
                    data-graph-node
                    href={comp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ scale: 0, opacity: 0, x: categories.find(c => c.id === selectedCategory)?.pos.x ?? 0, y: categories.find(c => c.id === selectedCategory)?.pos.y ?? 0 }}
                    animate={{ scale: 1, opacity: 1, x: comp.pos.x, y: comp.pos.y }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 15,
                      stiffness: 100,
                      delay: 0.2 + i * 0.06
                    }}
                    style={{ transformOrigin: '50% 22px' }}
                    className="absolute z-10 flex flex-col items-center gap-1 group pointer-events-auto touch-manipulation sm:[transform-origin:50%_24px]"
                  >
                    <div className="w-11 h-11 min-w-11 min-h-11 sm:w-12 sm:h-12 sm:min-w-12 sm:min-h-12 rounded-full border border-border bg-white group-hover:bg-ink group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm group-hover:-translate-y-1">
                      <span className="font-serif text-lg">{comp.initial}</span>
                    </div>
                    <div className="flex flex-col items-center max-w-[88px] sm:max-w-[100px] text-center px-0.5">
                      <span className="text-[10px] sm:text-[12px] font-semibold tracking-tight leading-tight">{comp.name}</span>
                      <span className="text-[8px] sm:text-[10px] text-ink-soft group-hover:text-ink/60 leading-tight mt-0.5">{comp.tag}</span>
                    </div>
                  </motion.a>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Map hint (fixed to viewport) */}
        <AnimatePresence>
          {level === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-[55] flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-3 max-w-[95vw] pointer-events-none"
            >
              <div className="w-1.5 h-1.5 bg-ink rounded-full animate-pulse shrink-0" />
              <span className="text-[11px] sm:text-[13px] text-center tracking-wide sm:tracking-widest uppercase font-medium text-ink/40 leading-snug">
                Tap the center to explore
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {level >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-[max(4.5rem,env(safe-area-inset-bottom,0px)+3.25rem)] sm:bottom-[5.25rem] left-1/2 -translate-x-1/2 z-[55] max-w-[min(22rem,92vw)] px-3 pointer-events-none text-center"
            >
              <p className="text-[10px] sm:text-[11px] text-ink-soft/90 leading-snug">
                Drag empty space to move the map · Scroll to zoom · Pinch on phone
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {level >= 1 && (Math.abs(viewPan.x) > 3 || Math.abs(viewPan.y) > 3 || Math.abs(viewZoom - 1) > 0.06) && (
          <button
            type="button"
            className="absolute left-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] z-[60] w-10 h-10 rounded-full bg-white border border-border shadow-md flex items-center justify-center text-ink hover:bg-hover active:scale-95 touch-manipulation"
            aria-label="Reset map view"
            onClick={() => {
              setViewPan({ x: 0, y: 0 });
              setViewZoom(1);
            }}
          >
            <LocateFixed className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        )}

        {/* Back Button */}
        <AnimatePresence>
          {level > 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={handleBack}
              className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] right-3 sm:bottom-10 sm:right-10 z-[60] bg-ink text-white pl-4 pr-5 py-2.5 sm:px-6 sm:py-3 rounded-full flex items-center gap-2 sm:gap-2.5 shadow-lg hover:pr-7 sm:hover:pr-8 transition-all active:scale-95 group touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-[14px] font-medium tracking-tight">Back</span>
            </motion.button>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
