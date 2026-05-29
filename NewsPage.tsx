import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, ArrowRight, Star, Tag } from 'lucide-react';
import PageHeader from './PageHeader.tsx';
import SeoHead from './SeoHead.tsx';
import { useNews, NEWS_CATEGORIES, categoryColor, pickLang, hasFa, hasEn } from './newsContext.tsx';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function readingTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border ${categoryColor(cat)}`}>
      {cat}
    </span>
  );
}

function GradientPlaceholder({ category, className = '' }: { category: string; className?: string }) {
  const gradients: Record<string, string> = {
    'Trade & Commerce':        'from-amber-900/60 via-port-surface to-port-bg',
    'Economy & Finance':       'from-cyan-900/60 via-port-surface to-port-bg',
    'Policy & Regulation':     'from-emerald-900/60 via-port-surface to-port-bg',
    'Market Trends':           'from-violet-900/60 via-port-surface to-port-bg',
    'Company News':            'from-sky-900/60 via-port-surface to-port-bg',
    'Logistics & Supply Chain':'from-orange-900/60 via-port-surface to-port-bg',
    'Technology & Innovation': 'from-indigo-900/60 via-port-surface to-port-bg',
    'General':                 'from-port-faint via-port-surface to-port-bg',
  };
  const g = gradients[category] ?? gradients['General'];
  return (
    <div className={`bg-gradient-to-br ${g} flex items-center justify-center ${className}`}>
      <div className="opacity-10">
        <div className="w-16 h-16 rounded-full border-2 border-current" />
      </div>
    </div>
  );
}

export default function NewsPage() {
  const { pathname } = useLocation();
  const { publishedArticles } = useNews();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [siteLang, setSiteLang] = useState<'en' | 'fa'>('en');

  const featured = publishedArticles.find((a) => a.featured) ?? publishedArticles[0];
  const rest = publishedArticles.filter((a) => a.id !== featured?.id);

  const filtered = activeCategory === 'All'
    ? rest
    : rest.filter((a) => a.category === activeCategory);

  const usedCategories = ['All', ...NEWS_CATEGORIES.filter((c) => publishedArticles.some((a) => a.category === c))];

  return (
    <div className="min-h-[100dvh] bg-port-bg text-port-ink font-sans flex flex-col overflow-x-hidden">
      <SeoHead pageTitle="Business News" pageDescription="Latest global trade, economy, and business news from Tohid Dayhami Business Solutions Center." />
      <PageHeader />

      <div className="fixed inset-0 port-grid pointer-events-none z-0" />

      <main className="relative z-10 flex-1">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <section className="py-16 px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="mb-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-port-gold/25 bg-port-gold-bg text-port-gold text-[11px] font-medium tracking-[0.18em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-port-gold animate-pulse" />
              Latest Updates
            </div>
            <h1 className="font-serif text-[clamp(2.2rem,7vw,4rem)] leading-none tracking-tight text-port-ink">
              Business News
            </h1>
            <p className="mt-3 text-port-soft text-base max-w-lg mx-auto">
              Stay informed with the latest trade, economy, and market intelligence.
            </p>
            {/* Language toggle */}
            {publishedArticles.some((a) => hasFa(a)) && (
              <div className="mt-5 inline-flex rounded-full border border-port-border bg-port-surface p-0.5 gap-0.5">
                {(['en', 'fa'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setSiteLang(l)}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-semibold tracking-wide transition-all ${
                      siteLang === l
                        ? 'bg-port-accent text-port-bg'
                        : 'text-port-soft hover:text-port-ink'
                    }`}
                  >
                    {l === 'en' ? 'English' : 'فارسی'}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </section>

        {publishedArticles.length === 0 ? (
          <div className="py-24 text-center text-port-soft text-sm">
            No articles published yet. Check back soon.
          </div>
        ) : (
          <>
            {/* ── Featured Article ──────────────────────────────────── */}
            {featured && (
              <section className="px-4 sm:px-8 mb-12 max-w-6xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <Link to={`/news/${featured.id}`} className="group block">
                    <div className="relative rounded-2xl overflow-hidden border border-port-border hover:border-port-accent/40 transition-all duration-300 shadow-lg hover:shadow-port-accent/10">
                      {/* Image / Gradient */}
                      <div className="relative h-64 sm:h-80 overflow-hidden">
                        {featured.imageUrl ? (
                          <img src={featured.imageUrl} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <GradientPlaceholder category={featured.category} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-port-bg via-port-bg/50 to-transparent" />
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-port-gold text-port-bg text-[10px] font-bold tracking-widest uppercase">
                            <Star className="w-2.5 h-2.5" strokeWidth={2.5} />
                            Featured
                          </span>
                          <CategoryBadge cat={featured.category} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="absolute bottom-0 inset-x-0 p-5 sm:p-8">
                        {hasFa(featured) && hasEn(featured) && (
                          <span className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 rounded-full bg-port-faint/30 border border-port-border text-[9px] text-port-soft font-medium tracking-wide uppercase">EN · FA</span>
                        )}
                        {hasFa(featured) && !hasEn(featured) && (
                          <span className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 rounded-full bg-port-accent-bg border border-port-accent/20 text-[9px] text-port-accent font-medium tracking-wide">فارسی</span>
                        )}
                        <h2 dir={pickLang(featured.title, featured.titleFa, siteLang).dir}
                          className={`font-serif text-xl sm:text-2xl lg:text-3xl text-port-ink group-hover:text-port-accent transition-colors leading-tight mb-2 line-clamp-2 ${pickLang(featured.title, featured.titleFa, siteLang).dir === 'rtl' ? 'text-right' : ''}`}>
                          {pickLang(featured.title, featured.titleFa, siteLang).text}
                        </h2>
                        <p dir={pickLang(featured.excerpt, featured.excerptFa, siteLang).dir}
                          className={`text-port-soft text-sm leading-relaxed line-clamp-2 hidden sm:block mb-4 max-w-2xl ${pickLang(featured.excerpt, featured.excerptFa, siteLang).dir === 'rtl' ? 'text-right' : ''}`}>
                          {pickLang(featured.excerpt, featured.excerptFa, siteLang).text}
                        </p>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3 text-[11px] text-port-faint">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(featured.publishedAt)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{readingTime(featured.content)}</span>
                            <span className="text-port-soft">By {featured.author}</span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-port-accent text-sm font-medium group-hover:gap-2.5 transition-all">
                            Read Article <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </section>
            )}

            {/* ── Category Filter ───────────────────────────────────── */}
            {rest.length > 0 && (
              <section className="px-4 sm:px-8 mb-8 max-w-6xl mx-auto">
                <div className="flex flex-wrap gap-2">
                  {usedCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                        activeCategory === cat
                          ? 'bg-port-accent text-port-bg border-port-accent'
                          : 'border-port-border text-port-soft hover:border-port-border-hi hover:text-port-ink'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ── Articles Grid ─────────────────────────────────────── */}
            <section className="px-4 sm:px-8 pb-20 max-w-6xl mx-auto">
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((article, i) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      layout
                    >
                      <Link to={`/news/${article.id}`} className="group flex flex-col h-full rounded-2xl border border-port-border bg-port-surface hover:border-port-accent/35 transition-all duration-300 overflow-hidden port-card-glow">
                        {/* Thumbnail */}
                        <div className="h-44 overflow-hidden relative flex-shrink-0">
                          {article.imageUrl ? (
                            <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <GradientPlaceholder category={article.category} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
                          )}
                          <div className="absolute top-3 left-3">
                            <CategoryBadge cat={article.category} />
                          </div>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col flex-1 p-4 gap-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasFa(article) && hasEn(article) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-port-faint/20 border border-port-border text-port-faint uppercase">EN·FA</span>
                            )}
                            {hasFa(article) && !hasEn(article) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-port-accent-bg border border-port-accent/20 text-port-accent">فارسی</span>
                            )}
                          </div>
                          <h3
                            dir={pickLang(article.title, article.titleFa, siteLang).dir}
                            className={`font-semibold text-[14px] text-port-ink group-hover:text-port-accent transition-colors leading-snug line-clamp-2 ${pickLang(article.title, article.titleFa, siteLang).dir === 'rtl' ? 'text-right' : ''}`}
                          >
                            {pickLang(article.title, article.titleFa, siteLang).text}
                          </h3>
                          <p
                            dir={pickLang(article.excerpt, article.excerptFa, siteLang).dir}
                            className={`text-[12px] text-port-soft leading-relaxed line-clamp-3 flex-1 ${pickLang(article.excerpt, article.excerptFa, siteLang).dir === 'rtl' ? 'text-right' : ''}`}
                          >
                            {pickLang(article.excerpt, article.excerptFa, siteLang).text}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-port-border">
                            <div className="flex items-center gap-2 text-[10px] text-port-faint">
                              <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{formatDate(article.publishedAt)}</span>
                              <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{readingTime(article.content)}</span>
                            </div>
                            <span className="text-[11px] text-port-accent font-medium flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                              Read <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
                {filtered.length === 0 && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center text-port-soft text-sm py-16"
                  >
                    No articles in this category yet.
                  </motion.p>
                )}
              </AnimatePresence>
            </section>
          </>
        )}
      </main>

      <footer className="relative z-10 border-t border-port-border px-6 py-6 text-center text-[12px] text-port-faint">
        © {new Date().getFullYear()} Tohid Dayhami Business Solutions Center · All rights reserved
      </footer>
    </div>
  );
}
