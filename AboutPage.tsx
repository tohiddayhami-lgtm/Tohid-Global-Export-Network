import { motion } from 'motion/react';
import { Globe, Award, Users, TrendingUp } from 'lucide-react';
import NavBar from './NavBar.tsx';

const TEAM = [
  {
    name: 'Tohid Dayhami',
    role: 'Founder & CEO',
    bio: 'Over 15 years of experience in international trade, export consulting, and global market development across Asia and the Middle East.',
  },
  {
    name: 'Sarah Chen',
    role: 'Head of Operations',
    bio: 'Expert in supply chain management and international logistics with a track record of connecting suppliers across 20+ countries.',
  },
  {
    name: 'Marco Rodriguez',
    role: 'Trade Relations Manager',
    bio: 'Specializes in building long-term B2B trade partnerships across European, Middle Eastern, and Asian markets.',
  },
];

const VALUES = [
  {
    title: 'Transparency',
    desc: 'We believe in open, honest trade relationships built on trust and clear communication between all parties.',
  },
  {
    title: 'Innovation',
    desc: 'We leverage cutting-edge technology to simplify complex international trade processes for businesses of all sizes.',
  },
  {
    title: 'Partnership',
    desc: 'Every vendor and buyer is a long-term partner, not just a transaction. We invest in lasting relationships.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-[100dvh] bg-port-bg text-port-ink font-sans flex flex-col overflow-x-hidden">
      <NavBar />
      <div className="fixed inset-0 port-grid pointer-events-none z-0" />

      <main className="relative z-10 flex-1 px-4 sm:px-8 py-16 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Page header */}
          <div className="mb-14">
            <p className="text-port-soft text-xs tracking-[0.16em] uppercase mb-3">Who We Are</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-port-ink mb-6">
              About <span className="text-port-accent">Us</span>
            </h1>
            <p className="text-port-soft text-lg leading-relaxed max-w-2xl">
              Tohid Global Export Network is a premier virtual trade platform connecting businesses with
              the world's most vibrant export markets. We bridge the gap between suppliers and
              international buyers through technology and deep market expertise.
            </p>
          </div>

          {/* Mission */}
          <section className="mb-14 p-8 rounded-2xl border border-port-border bg-port-surface">
            <h2 className="font-serif text-2xl text-port-ink mb-4">Our Mission</h2>
            <p className="text-port-soft leading-relaxed">
              To empower businesses worldwide by providing seamless access to global export opportunities.
              We believe that every company — regardless of size — deserves equal access to international
              markets, reliable trade partners, and transparent export pathways. Our platform serves as
              the digital bridge that connects producers with buyers across continents.
            </p>
          </section>

          {/* Stats */}
          <section className="mb-14 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: '10+', label: 'Countries', Icon: Globe },
              { value: '150+', label: 'Vendors', Icon: Users },
              { value: '40+', label: 'Trade Categories', Icon: Award },
              { value: '5+', label: 'Years Active', Icon: TrendingUp },
            ].map(({ value, label, Icon }, i) => (
              <div key={i} className="p-6 rounded-2xl border border-port-border bg-port-surface text-center">
                <Icon className="w-5 h-5 text-port-accent mx-auto mb-3" strokeWidth={1.5} />
                <div className="font-serif text-3xl text-port-ink mb-1">{value}</div>
                <div className="text-xs text-port-soft tracking-wide">{label}</div>
              </div>
            ))}
          </section>

          {/* Values */}
          <section className="mb-14">
            <h2 className="font-serif text-2xl text-port-ink mb-6">Our Values</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {VALUES.map((v, i) => (
                <div key={i} className="p-6 rounded-2xl border border-port-border bg-port-surface">
                  <h3 className="font-semibold text-port-accent mb-2">{v.title}</h3>
                  <p className="text-sm text-port-soft leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Story */}
          <section className="mb-14 p-8 rounded-2xl border border-port-border bg-port-surface">
            <h2 className="font-serif text-2xl text-port-ink mb-4">Our Story</h2>
            <div className="space-y-4 text-port-soft leading-relaxed">
              <p>
                Founded in 2019, Tohid Global Export Network began as a small consultancy helping
                Iranian exporters find reliable international buyers. What started as a manual
                matchmaking service quickly evolved into a full-scale digital trade platform after
                recognizing the massive gap in accessible, technology-driven export solutions.
              </p>
              <p>
                Today, we operate across 10 countries with over 150 verified vendors and 40 trade
                categories ranging from premium saffron and handmade carpets to cutting-edge IT
                services and industrial machinery. Our virtual "Meta Port" interface gives buyers
                and sellers a unique, intuitive way to explore and connect.
              </p>
              <p>
                Our technology-first approach combined with deep human expertise makes us uniquely
                positioned to serve both small producers entering international markets for the
                first time and established exporters looking to expand into new territories.
              </p>
            </div>
          </section>

          {/* Team */}
          <section>
            <h2 className="font-serif text-2xl text-port-ink mb-6">Our Team</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {TEAM.map((member, i) => (
                <div key={i} className="p-6 rounded-2xl border border-port-border bg-port-surface">
                  <div className="w-12 h-12 rounded-full bg-port-accent-bg border border-port-accent/30 flex items-center justify-center mb-4">
                    <span className="font-serif text-xl text-port-accent">{member.name[0]}</span>
                  </div>
                  <h3 className="font-semibold text-port-ink mb-1">{member.name}</h3>
                  <p className="text-xs text-port-accent mb-3 tracking-wide">{member.role}</p>
                  <p className="text-sm text-port-soft leading-relaxed">{member.bio}</p>
                </div>
              ))}
            </div>
          </section>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-port-border py-8 px-4 sm:px-8 text-center">
        <p className="text-xs text-port-faint">© 2025 Tohid Global Export Network. All rights reserved.</p>
      </footer>
    </div>
  );
}
