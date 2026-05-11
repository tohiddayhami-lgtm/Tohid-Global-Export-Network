/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Menu, ArrowLeft, Globe } from 'lucide-react';
import { EXPORT_DATA, Country, Category, Company } from './constants';

// --- Types ---
type AppLevel = 0 | 1 | 2 | 3;

// --- Helpers ---
function getFanPositions(count: number, anchor: { x: number, y: number }, radius: number, spreadDegrees: number) {
  // Anchor's angle from root (0,0)
  const anchorAngle = Math.atan2(anchor.y, anchor.x);
  // Fan facing AWAY from root
  const spread = (spreadDegrees * Math.PI) / 180;
  const startAngle = anchorAngle - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;

  return Array.from({ length: count }, (_, i) => {
    const angle = startAngle + step * i + (count === 1 ? 0 : 0);
    return {
      x: anchor.x + Math.cos(angle) * radius,
      y: anchor.y + Math.sin(angle) * radius
    };
  });
}

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

export default function App() {
  const [level, setLevel] = useState<AppLevel>(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 700 });

  // Update canvas size for SVG mapping
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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

  const countries = useMemo(() => Object.values(EXPORT_DATA), []);
  
  const categories = useMemo(() => {
    if (!selectedCountry) return [];
    const country = EXPORT_DATA[selectedCountry];
    const catList = Object.entries(country.categories);
    const positions = getFanPositions(catList.length, country.anchor, 200, 216);
    return catList.map(([id, cat], i) => ({ id, ...cat, pos: positions[i] }));
  }, [selectedCountry]);

  const companies = useMemo(() => {
    if (!selectedCountry || !selectedCategory) return [];
    const category = EXPORT_DATA[selectedCountry].categories[selectedCategory];
    const anchor = categories.find(c => c.id === selectedCategory)?.pos || { x: 0, y: 0 };
    const positions = getFanPositions(category.companies.length, anchor, 170, 200);
    return category.companies.map((comp, i) => ({ ...comp, pos: positions[i] }));
  }, [selectedCountry, selectedCategory, categories]);

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
    if (level === 2) return `Discover / ${EXPORT_DATA[selectedCountry!].label}`;
    if (level === 3) return `Discover / ${EXPORT_DATA[selectedCountry!].label} / ${EXPORT_DATA[selectedCountry!].categories[selectedCategory!].label}`;
    return 'Discover';
  }, [level, selectedCountry, selectedCategory]);

  return (
    <div className="min-h-screen bg-bg flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 h-[72px] blur-nav border-b border-black/5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-ink flex items-center justify-center">
            <span className="text-white font-serif text-lg leading-none mt-0.5">G</span>
          </div>
          <span className="font-semibold text-[15px] tracking-tight hidden sm:inline">Global Export Network</span>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
          <span className="text-ink-soft text-[13px] font-medium tracking-tight">
            {breadcrumb}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-hover active:scale-95" aria-label="Search">
            <Search className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
          <button className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-hover active:scale-95" aria-label="Menu">
            <Menu className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Main Stage */}
      <main ref={canvasRef} className="flex-1 relative dot-grid overflow-hidden">
        {/* Background SVG Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet">
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
              const end = toSVG(c.anchor.x, c.anchor.y);
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
              const country = EXPORT_DATA[selectedCountry!];
              const start = toSVG(country.anchor.x, country.anchor.y);
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

            {/* Level 3 Lines (Category to Companies) */}
            {companies.map((comp, i) => {
              const catPos = categories.find(c => c.id === selectedCategory)?.pos || { x: 0, y: 0 };
              const start = toSVG(catPos.x, catPos.y);
              const end = toSVG(comp.pos.x, comp.pos.y);
              return (
                <motion.line
                  key={`line-l3-${comp.name}`}
                  x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                  stroke="currentColor" strokeWidth={1.4} strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: level >= 3 ? 1 : 0, opacity: level >= 3 ? 0.9 : 0 }}
                  transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1], delay: 0.3 + i * 0.05 }}
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
              className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
            >
              <h2 className="text-2xl font-serif text-ink tracking-tight">
                {selectedCountry && EXPORT_DATA[selectedCountry].label}
                {level === 3 && selectedCategory && ` — ${EXPORT_DATA[selectedCountry].categories[selectedCategory].label}`}
              </h2>
              <div className="w-[30px] h-px bg-ink mt-2" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nodes Layer */}
        <div className="absolute inset-0 flex items-center justify-center">
          
          {/* Root Node */}
          <motion.button
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
            className="rounded-full border-[1.5px] border-ink flex flex-col items-center justify-center z-40 transition-all duration-500 ease-in-out shadow-sm"
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
                  initial={{ scale: 0.3, opacity: 0, x: 0, y: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: (level === 1 || selectedCountry === c.id) ? 1 : 0.2, 
                    x: c.anchor.x, 
                    y: c.anchor.y 
                  }}
                  exit={{ scale: 0.3, opacity: 0 }}
                  transition={{ 
                    type: 'spring', 
                    damping: 20, 
                    stiffness: 150, 
                    delay: level === 1 ? i * 0.07 : 0 
                  }}
                  className="absolute flex flex-col items-center gap-2 group cursor-pointer z-30"
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
            {level >= 2 && categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ scale: 0, opacity: 0, x: EXPORT_DATA[selectedCountry!].anchor.x, y: EXPORT_DATA[selectedCountry!].anchor.y }}
                animate={{ 
                  scale: 1, 
                  opacity: (level === 2 || selectedCategory === cat.id) ? 1 : 0.2, 
                  x: cat.pos.x, 
                  y: cat.pos.y 
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  type: 'spring', 
                  damping: 18, 
                  stiffness: 120, 
                  delay: level === 2 ? i * 0.08 : 0 
                }}
                className="absolute flex flex-col items-center gap-1.5 group cursor-pointer z-20"
                onClick={() => {
                  if (level === 2) {
                    setSelectedCategory(cat.id);
                    setLevel(3);
                  } else if (level === 3 && selectedCategory === cat.id) {
                    handleBack();
                  }
                }}
              >
                <div className={`w-11 h-11 sm:w-[56px] sm:h-[56px] rounded-full border border-border flex items-center justify-center transition-all duration-300 ${selectedCategory === cat.id ? 'bg-ink border-ink text-white' : 'bg-white group-hover:bg-hover'}`}>
                  {cat.icon && <cat.icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />}
                </div>
                <div className="flex flex-col items-center max-w-[80px] text-center">
                  <span className="text-[12px] sm:text-[13px] leading-tight font-medium tracking-tight">{cat.label}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Level 3 Nodes (Companies) */}
          <AnimatePresence>
            {level === 3 && companies.map((comp, i) => (
              <motion.a
                key={comp.name}
                href={comp.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ scale: 0, opacity: 0, x: categories.find(c => c.id === selectedCategory)?.pos.x, y: categories.find(c => c.id === selectedCategory)?.pos.y }}
                animate={{ scale: 1, opacity: 1, x: comp.pos.x, y: comp.pos.y }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  type: 'spring', 
                  damping: 15, 
                  stiffness: 100, 
                  delay: 0.2 + i * 0.06 
                }}
                className="absolute flex flex-col items-center gap-1 group z-10"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-border bg-white group-hover:bg-ink group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm group-hover:-translate-y-1">
                  <span className="font-serif text-lg">{comp.initial}</span>
                </div>
                <div className="flex flex-col items-center max-w-[100px] text-center">
                  <span className="text-[11px] sm:text-[12px] font-semibold tracking-tight">{comp.name}</span>
                  <span className="text-[9px] sm:text-[10px] text-ink-soft group-hover:text-ink/60">{comp.tag}</span>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        </div>

        {/* Level 0 Hint */}
        <AnimatePresence>
          {level === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 bg-ink rounded-full animate-pulse" />
              <span className="text-[13px] tracking-widest uppercase font-medium text-ink/40">Click the center to explore</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back Button */}
        <AnimatePresence>
          {level > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={handleBack}
              className="absolute bottom-10 right-10 bg-ink text-white px-6 py-3 rounded-full flex items-center gap-2.5 z-50 shadow-lg hover:pr-8 transition-all active:scale-95 group"
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
