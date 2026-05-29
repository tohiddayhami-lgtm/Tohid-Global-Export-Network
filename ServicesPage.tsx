import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Settings2, FileText, Network, Truck, Handshake, ArrowRight } from 'lucide-react';
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

export default function ServicesPage() {
  const { pageContent } = usePageContent();

  const services = [
    {
      icon: FileText,
      title: pageContent.service1Title,
      desc: pageContent.service1Desc,
      badge: 'Consulting',
    },
    {
      icon: Network,
      title: pageContent.service2Title,
      desc: pageContent.service2Desc,
      badge: 'Network',
    },
    {
      icon: Truck,
      title: pageContent.service3Title,
      desc: pageContent.service3Desc,
      badge: 'Logistics',
    },
    {
      icon: Handshake,
      title: pageContent.service4Title,
      desc: pageContent.service4Desc,
      badge: 'Matchmaking',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-port-bg text-port-ink font-sans flex flex-col overflow-x-hidden">
      <PageHeader />

      <div className="fixed inset-0 port-grid pointer-events-none z-0" />

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="relative py-24 px-6 flex flex-col items-center text-center overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-port-gold/[0.04] blur-[100px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 max-w-2xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-port-gold/25 bg-port-gold-bg text-port-gold text-[11px] font-medium tracking-[0.18em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-port-gold animate-pulse" />
              What We Offer
            </div>
            <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] leading-[0.9] tracking-tight mb-4">
              <span className="block text-port-ink">{pageContent.servicesTitle}</span>
            </h1>
            <p className="text-port-soft text-lg mt-4 leading-relaxed">{pageContent.servicesSubtitle}</p>
          </motion.div>
        </section>

        {/* Services Grid */}
        <section className="py-12 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.35 }}
                  className="group flex flex-col p-6 rounded-2xl border border-port-border bg-port-surface port-card-glow hover:border-port-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-port-accent-bg border border-port-accent-border flex items-center justify-center text-port-accent group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] font-medium text-port-faint tracking-wider uppercase border border-port-border rounded-full px-2 py-0.5">
                      {s.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[15px] text-port-ink mb-2 group-hover:text-port-accent transition-colors">
                    {s.title}
                  </h3>
                  <p className="text-[13px] text-port-soft leading-relaxed flex-1">{s.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-port-faint group-hover:text-port-accent transition-colors text-[12px] font-medium">
                    <span>Learn more</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 mb-8">
          <div className="max-w-2xl mx-auto text-center p-10 rounded-2xl border border-port-border bg-port-surface relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-port-accent/30 to-transparent" />
            <h2 className="font-serif text-2xl sm:text-3xl text-port-ink mb-3">Ready to expand globally?</h2>
            <p className="text-port-soft text-sm mb-6 leading-relaxed">
              Let our experts guide you through every step of your international expansion journey.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-port-accent text-port-bg font-semibold text-[14px] hover:opacity-90 transition-opacity"
            >
              Get in Touch
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-port-border px-6 py-6 text-center text-[12px] text-port-faint">
        © {new Date().getFullYear()} Tohid Dayhami Business Solutions Center · All rights reserved
      </footer>
    </div>
  );
}
