import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Settings2, Users, Globe, Award, TrendingUp } from 'lucide-react';
import { usePageContent } from './pageContentContext.tsx';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'Services', to: '/services' },
  { label: 'Contact Us', to: '/contact' },
];

function PageHeader() {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-50 h-16 port-glass-nav border-b border-port-border px-4 sm:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 shrink-0 port-header-fade">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full border border-port-accent/40 bg-port-accent-bg flex items-center justify-center shrink-0">
            <span className="font-serif text-port-accent text-base leading-none">T</span>
          </div>
          <div className="hidden sm:flex flex-col leading-none gap-0.5">
            <span className="font-semibold text-[13px] tracking-tight text-port-ink leading-none">Tohid Dayhami</span>
            <span className="text-[10px] text-port-soft tracking-wide leading-none hidden md:block">Business Solutions Center</span>
          </div>
        </Link>
      </div>

      <nav className="hidden sm:flex items-center gap-0.5 flex-1 justify-center">
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

      <div className="flex items-center gap-1 shrink-0">
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

export default function AboutPage() {
  const { pageContent } = usePageContent();

  const stats = [
    { value: pageContent.aboutStat1Value, label: pageContent.aboutStat1Label },
    { value: pageContent.aboutStat2Value, label: pageContent.aboutStat2Label },
    { value: pageContent.aboutStat3Value, label: pageContent.aboutStat3Label },
  ];

  const values = [
    { icon: Globe, title: 'Global Reach', desc: 'Operating across 20+ countries with established trade corridors and verified partners.' },
    { icon: Award, title: 'Trusted Expertise', desc: 'Over a decade of proven experience in international trade and export consulting.' },
    { icon: Users, title: 'Strong Network', desc: 'A curated network of 500+ importers, distributors, and logistics partners worldwide.' },
    { icon: TrendingUp, title: 'Results Driven', desc: 'Focused on measurable outcomes — market access, revenue growth, and long-term partnerships.' },
  ];

  return (
    <div className="min-h-[100dvh] bg-port-bg text-port-ink font-sans flex flex-col overflow-x-hidden">
      <PageHeader />

      <div className="fixed inset-0 port-grid pointer-events-none z-0" />

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="relative py-24 px-6 flex flex-col items-center text-center overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-port-accent/[0.04] blur-[100px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 max-w-2xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-port-accent/25 bg-port-accent-bg text-port-accent text-[11px] font-medium tracking-[0.18em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-port-accent animate-pulse" />
              Who We Are
            </div>
            <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] leading-[0.9] tracking-tight mb-4">
              <span className="block text-port-ink">{pageContent.aboutTitle}</span>
            </h1>
            <p className="text-port-soft text-lg mt-4 leading-relaxed">{pageContent.aboutSubtitle}</p>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="py-12 px-6">
          <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.35 }}
                className="flex flex-col items-center gap-2 p-6 rounded-2xl border border-port-border bg-port-surface port-card-glow"
              >
                <span className="font-serif text-3xl sm:text-4xl text-port-accent">{s.value}</span>
                <span className="text-[12px] text-port-soft tracking-wide text-center">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Story */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-port-ink">Our Story</h2>
            <p className="text-port-soft text-[15px] leading-relaxed">{pageContent.aboutBody1}</p>
            <p className="text-port-soft text-[15px] leading-relaxed">{pageContent.aboutBody2}</p>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-6 mb-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-2xl sm:text-3xl text-port-ink mb-10 text-center">Our Values</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {values.map((v, i) => {
                const Icon = v.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.32 }}
                    className="flex gap-4 p-6 rounded-2xl border border-port-border bg-port-surface port-card-glow"
                  >
                    <div className="w-10 h-10 rounded-xl bg-port-accent-bg border border-port-accent-border flex items-center justify-center text-port-accent shrink-0">
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[14px] text-port-ink mb-1">{v.title}</h3>
                      <p className="text-[13px] text-port-soft leading-relaxed">{v.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-port-border px-6 py-6 text-center text-[12px] text-port-faint">
        © {new Date().getFullYear()} Tohid Dayhami Business Solutions Center · All rights reserved
      </footer>
    </div>
  );
}
