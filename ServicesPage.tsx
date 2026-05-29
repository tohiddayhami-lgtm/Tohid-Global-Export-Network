import { motion } from 'motion/react';
import {
  Package, Truck, FileText, Globe, Shield,
  BarChart3, Search, Handshake,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NavBar from './NavBar.tsx';

const SERVICES = [
  {
    Icon: Globe,
    title: 'Market Access',
    desc: 'Connect with verified buyers and suppliers across 10+ countries through our curated trade network.',
    details: 'Real-time access to global markets with verified partners across Iran, India, Turkey, UAE, Oman, China, and more.',
  },
  {
    Icon: Package,
    title: 'Export Consulting',
    desc: 'Expert guidance on export regulations, documentation, and compliance for international trade.',
    details: 'Navigate complex export requirements with our team of trade specialists who have decades of combined experience.',
  },
  {
    Icon: Truck,
    title: 'Logistics Support',
    desc: 'End-to-end logistics solutions including freight forwarding, customs clearance, and last-mile delivery.',
    details: 'We partner with leading logistics providers to ensure your goods reach their destination safely and on time.',
  },
  {
    Icon: FileText,
    title: 'Trade Documentation',
    desc: 'Complete documentation support including certificates of origin, bills of lading, and export licenses.',
    details: 'Our documentation experts ensure all paperwork is correctly prepared and submitted to avoid costly delays.',
  },
  {
    Icon: Shield,
    title: 'Trade Finance',
    desc: 'Access to letters of credit, trade insurance, and financing solutions tailored for exporters.',
    details: 'Reduce financial risk with our trade finance partners who offer competitive rates for international transactions.',
  },
  {
    Icon: Search,
    title: 'Market Research',
    desc: 'In-depth market analysis and intelligence reports for targeted export markets.',
    details: 'Make informed decisions with our data-driven research covering demand trends, pricing, and competition analysis.',
  },
  {
    Icon: Handshake,
    title: 'B2B Matchmaking',
    desc: 'Curated introductions between qualified buyers and sellers for high-value trade partnerships.',
    details: 'Our matching system connects you with the most relevant trade partners based on product type, volume, and geography.',
  },
  {
    Icon: BarChart3,
    title: 'Performance Analytics',
    desc: 'Track your export performance with real-time dashboards and actionable insights.',
    details: 'Monitor sales trends, market penetration, and logistics performance all in one unified platform.',
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-[100dvh] bg-port-bg text-port-ink font-sans flex flex-col overflow-x-hidden">
      <NavBar />
      <div className="fixed inset-0 port-grid pointer-events-none z-0" />

      <main className="relative z-10 flex-1 px-4 sm:px-8 py-16 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Page header */}
          <div className="mb-14">
            <p className="text-port-soft text-xs tracking-[0.16em] uppercase mb-3">What We Offer</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-port-ink mb-6">
              Our <span className="text-port-accent">Services</span>
            </h1>
            <p className="text-port-soft text-lg leading-relaxed max-w-2xl">
              From market entry strategy to export execution, we provide comprehensive solutions
              that help businesses expand globally with confidence and speed.
            </p>
          </div>

          {/* Services grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-16">
            {SERVICES.map(({ Icon, title, desc, details }, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-port-border bg-port-surface hover:border-port-accent/30 port-card-glow transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-port-accent-bg border border-port-accent-border flex items-center justify-center text-port-accent mb-4 group-hover:bg-port-accent/20 group-hover:scale-105 transition-all">
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-port-ink mb-2 group-hover:text-port-accent transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-port-soft leading-relaxed mb-3">{desc}</p>
                <p className="text-xs text-port-faint leading-relaxed">{details}</p>
              </div>
            ))}
          </div>

          {/* Process section */}
          <section className="mb-16">
            <h2 className="font-serif text-2xl text-port-ink mb-8 text-center">How It Works</h2>
            <div className="grid sm:grid-cols-4 gap-4">
              {[
                { step: '01', title: 'Register', desc: 'Create your free account and complete your company profile.' },
                { step: '02', title: 'Browse', desc: 'Explore our trade network across 10 countries and 40+ categories.' },
                { step: '03', title: 'Connect', desc: 'Contact verified vendors or buyers directly through our platform.' },
                { step: '04', title: 'Trade', desc: 'Finalize deals with full documentation and logistics support.' },
              ].map(({ step, title, desc }, i) => (
                <div key={i} className="p-6 rounded-2xl border border-port-border bg-port-surface text-center">
                  <div className="font-serif text-3xl text-port-accent/40 mb-3">{step}</div>
                  <h3 className="font-semibold text-port-ink mb-2">{title}</h3>
                  <p className="text-sm text-port-soft leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="p-8 sm:p-12 rounded-2xl border border-port-accent/20 bg-port-accent-bg text-center">
            <div className="mb-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-port-accent/25 bg-port-bg text-port-accent text-[11px] font-medium tracking-[0.18em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-port-accent animate-pulse" />
              Start Today
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-port-ink mt-4 mb-3">
              Ready to Go Global?
            </h2>
            <p className="text-port-soft mb-8 max-w-md mx-auto leading-relaxed">
              Join hundreds of businesses that have expanded their reach through our export network.
              No upfront fees — explore for free.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-port-accent text-port-bg font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Get Started Today
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-port-border text-port-soft text-sm hover:border-port-border-hi hover:text-port-ink transition-all"
              >
                Explore the Port
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-port-border py-8 px-4 sm:px-8 text-center">
        <p className="text-xs text-port-faint">© 2025 Tohid Global Export Network. All rights reserved.</p>
      </footer>
    </div>
  );
}
