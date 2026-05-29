import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Clock, Tag, Share2, ChevronRight } from 'lucide-react';
import PageHeader from './PageHeader.tsx';
import SeoHead from './SeoHead.tsx';
import { useNews, categoryColor, pickLang, hasFa, hasEn } from './newsContext.tsx';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

function readingTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function GradientBg({ category }: { category: string }) {
  const gradients: Record<string, string> = {
    'Trade & Commerce':        'from-amber-900/40 to-port-bg',
    'Economy & Finance':       'from-cyan-900/40 to-port-bg',
    'Policy & Regulation':     'from-emerald-900/40 to-port-bg',
    'Market Trends':           'from-violet-900/40 to-port-bg',
    'Company News':            'from-sky-900/40 to-port-bg',
    'Logistics & Supply Chain':'from-orange-900/40 to-port-bg',
    'Technology & Innovation': 'from-indigo-900/40 to-port-bg',
    'General':                 'from-port-faint/20 to-port-bg',
  };
  return (
    <div className={`absolute inset-0 bg-gradient-to-b ${gradients[category] ?? gradients['General']} pointer-events-none`} />
  );
}

export default function NewsArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { publishedArticles } = useNews();
  const [lang, setLang] = useState<'en' | 'fa'>('en');

  const article = publishedArticles.find((a) => a.id === id);

  if (!article) {
    return (
      <div className="min-h-[100dvh] bg-port-bg text-port-ink font-sans flex flex-col">
        <PageHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-port-soft text-lg">Article not found.</p>
          <Link to="/news" className="text-port-accent text-sm hover:underline">← Back to News</Link>
        </div>
      </div>
    );
  }

  const related = publishedArticles
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  const articleHasFa = hasFa(article);
  const articleHasEn = hasEn(article);
  const activeLang = articleHasFa && !articleHasEn ? 'fa' : lang;

  const titleDisplay  = pickLang(article.title,   article.titleFa,   activeLang);
  const excerptDisplay = pickLang(article.excerpt, article.excerptFa, activeLang);
  const contentDisplay = pickLang(article.content, article.contentFa, activeLang);
  const paragraphs = contentDisplay.text.split('\n').filter(Boolean);

  const handleShare = () => {
    if (navigator.share) {
      void navigator.share({ title: article.title, text: article.excerpt, url: window.location.href });
    } else {
      void navigator.clipboard.writeText(window.location.href);
      window.alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-port-bg text-port-ink font-sans flex flex-col overflow-x-hidden">
      <SeoHead pageTitle={article.title} pageDescription={article.excerpt} />
      <PageHeader />

      <div className="fixed inset-0 port-grid pointer-events-none z-0" />

      <main className="relative z-10 flex-1">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <GradientBg category={article.category} />
          {article.imageUrl && (
            <div className="absolute inset-0">
              <img src={article.imageUrl} alt="" className="w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-port-bg/70 to-port-bg" />
            </div>
          )}

          <div className="relative max-w-3xl mx-auto px-6 py-20 sm:py-28">
            {/* Breadcrumb */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1.5 text-[12px] text-port-faint mb-8"
            >
              <Link to="/" className="hover:text-port-soft transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link to="/news" className="hover:text-port-soft transition-colors">News</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-port-soft truncate max-w-[200px]">{article.title}</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Category */}
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase border mb-5 ${categoryColor(article.category)}`}>
                {article.category}
              </span>

              {/* Language toggle (only shown if bilingual) */}
              {articleHasFa && articleHasEn && (
                <div className="inline-flex rounded-full border border-port-border bg-port-surface p-0.5 mb-5 gap-0.5">
                  {(['en', 'fa'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className={`px-4 py-1 rounded-full text-[12px] font-semibold tracking-wide transition-all ${
                        activeLang === l
                          ? 'bg-port-accent text-port-bg'
                          : 'text-port-soft hover:text-port-ink'
                      }`}
                    >
                      {l === 'en' ? 'EN' : 'FA — فارسی'}
                    </button>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1
                dir={titleDisplay.dir}
                className={`font-serif text-[clamp(1.75rem,5vw,3rem)] leading-tight tracking-tight text-port-ink mb-5 ${titleDisplay.dir === 'rtl' ? 'text-right' : ''}`}
              >
                {titleDisplay.text}
              </h1>

              {/* Excerpt */}
              <p
                dir={excerptDisplay.dir}
                className={`text-port-soft text-base sm:text-lg leading-relaxed mb-8 ${excerptDisplay.dir === 'rtl' ? 'text-right' : ''}`}
              >
                {excerptDisplay.text}
              </p>

              {/* Meta row */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-port-border">
                <div className="flex flex-wrap items-center gap-4 text-[12px] text-port-faint">
                  <span className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full bg-port-accent-bg border border-port-accent/30 flex items-center justify-center text-port-accent font-serif text-xs">
                      {article.author[0]}
                    </div>
                    <span className="text-port-soft font-medium">{article.author}</span>
                  </span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(article.publishedAt)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{readingTime(article.content)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-port-border text-[12px] text-port-soft hover:text-port-ink hover:border-port-border-hi transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Article Body ──────────────────────────────────────────────── */}
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="max-w-3xl mx-auto px-6 py-10 space-y-5"
        >
          {paragraphs.map((para, i) => (
            <p
              key={i}
              dir={contentDisplay.dir}
              className={`text-[15px] text-port-soft leading-[1.9] tracking-[0.01em] ${contentDisplay.dir === 'rtl' ? 'text-right' : ''}`}
            >
              {para}
            </p>
          ))}

          {/* Tags */}
          {article.tags && (
            <div className="flex flex-wrap items-center gap-2 pt-8 border-t border-port-border">
              <Tag className="w-3.5 h-3.5 text-port-faint" />
              {article.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="px-2.5 py-0.5 rounded-full border border-port-border text-[11px] text-port-faint bg-port-surface">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </motion.article>

        {/* ── Related Articles ──────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="max-w-3xl mx-auto px-6 pb-16">
            <div className="border-t border-port-border pt-10">
              <h2 className="font-serif text-xl text-port-ink mb-6">Related Articles</h2>
              <div className="space-y-3">
                {related.map((a) => (
                  <Link
                    key={a.id}
                    to={`/news/${a.id}`}
                    className="group flex items-start gap-4 p-4 rounded-xl border border-port-border hover:border-port-accent/30 bg-port-surface transition-all"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      {a.imageUrl
                        ? <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover" />
                        : <div className={`w-full h-full bg-gradient-to-br from-port-faint/30 to-port-bg`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-port-ink group-hover:text-port-accent transition-colors line-clamp-2 leading-snug">
                        {a.title}
                      </p>
                      <p className="text-[11px] text-port-faint mt-1">{formatDate(a.publishedAt)}</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-port-faint rotate-180 shrink-0 group-hover:text-port-accent transition-colors mt-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Back ──────────────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-6 pb-16 flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate('/news')}
            className="inline-flex items-center gap-2 text-port-soft hover:text-port-ink text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </button>
        </div>
      </main>

      <footer className="relative z-10 border-t border-port-border px-6 py-6 text-center text-[12px] text-port-faint">
        © {new Date().getFullYear()} Tohid Dayhami Business Solutions Center · All rights reserved
      </footer>
    </div>
  );
}
