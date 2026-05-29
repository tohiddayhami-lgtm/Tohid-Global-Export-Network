import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import NavBar from './NavBar.tsx';

const CONTACT_INFO = [
  {
    Icon: Mail,
    title: 'Email',
    lines: ['info@tohidglobal.com', 'trade@tohidglobal.com'],
  },
  {
    Icon: Phone,
    title: 'Phone',
    lines: ['+98 21 1234 5678', '+1 (555) 234-5678'],
  },
  {
    Icon: MapPin,
    title: 'Headquarters',
    lines: ['Unit 5, Trade Tower', 'Tehran, Iran 1234567'],
  },
  {
    Icon: Clock,
    title: 'Business Hours',
    lines: ['Sat – Wed: 9:00 am – 6:00 pm', 'Thu: 9:00 am – 1:00 pm'],
  },
];

type FormState = { name: string; email: string; company: string; subject: string; message: string };
const EMPTY_FORM: FormState = { name: '', email: '', company: '', subject: '', message: '' };

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [sent, setSent] = useState(false);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setForm(EMPTY_FORM);
  };

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
            <p className="text-port-soft text-xs tracking-[0.16em] uppercase mb-3">Get In Touch</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-port-ink mb-6">
              Contact <span className="text-port-accent">Us</span>
            </h1>
            <p className="text-port-soft text-lg leading-relaxed max-w-2xl">
              Have a question about our services or want to explore export opportunities?
              We'd love to hear from you. Our team typically responds within 24 hours.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-8">
            {/* Contact Form */}
            <div className="p-8 rounded-2xl border border-port-border bg-port-surface">
              <h2 className="font-serif text-xl text-port-ink mb-6">Send a Message</h2>

              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-port-accent-bg border border-port-accent/30 flex items-center justify-center mx-auto mb-5">
                    <Send className="w-6 h-6 text-port-accent" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-xl text-port-ink mb-2">Message Sent!</h3>
                  <p className="text-sm text-port-soft mb-6">
                    Thank you for reaching out. We'll get back to you within 24 business hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="text-sm text-port-accent hover:underline"
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <label className="block text-xs">
                      <span className="text-port-soft mb-1.5 block">Full Name *</span>
                      <input
                        required
                        className="w-full rounded-xl border border-port-border bg-port-bg px-4 py-3 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                        placeholder="John Smith"
                        value={form.name}
                        onChange={set('name')}
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="text-port-soft mb-1.5 block">Email Address *</span>
                      <input
                        required
                        type="email"
                        className="w-full rounded-xl border border-port-border bg-port-bg px-4 py-3 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                        placeholder="john@company.com"
                        value={form.email}
                        onChange={set('email')}
                      />
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <label className="block text-xs">
                      <span className="text-port-soft mb-1.5 block">Company</span>
                      <input
                        className="w-full rounded-xl border border-port-border bg-port-bg px-4 py-3 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                        placeholder="Your Company Ltd."
                        value={form.company}
                        onChange={set('company')}
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="text-port-soft mb-1.5 block">Subject *</span>
                      <select
                        required
                        className="w-full rounded-xl border border-port-border bg-port-bg px-4 py-3 text-sm text-port-ink focus:outline-none focus:border-port-accent/50 transition-colors"
                        value={form.subject}
                        onChange={set('subject')}
                      >
                        <option value="">Select a topic…</option>
                        <option value="export">Export Consulting</option>
                        <option value="vendor">Vendor Registration</option>
                        <option value="buyer">Buyer Inquiry</option>
                        <option value="logistics">Logistics Support</option>
                        <option value="partnership">Partnership Proposal</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>

                  <label className="block text-xs">
                    <span className="text-port-soft mb-1.5 block">Message *</span>
                    <textarea
                      required
                      rows={5}
                      className="w-full rounded-xl border border-port-border bg-port-bg px-4 py-3 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors resize-none"
                      placeholder="Tell us about your export needs or questions…"
                      value={form.message}
                      onChange={set('message')}
                    />
                  </label>

                  <button
                    type="submit"
                    className="port-enter-btn w-full rounded-full bg-port-accent text-port-bg font-semibold py-3.5 text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" strokeWidth={1.5} />
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              {CONTACT_INFO.map(({ Icon, title, lines }, i) => (
                <div key={i} className="p-5 rounded-2xl border border-port-border bg-port-surface flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-port-accent-bg border border-port-accent-border flex items-center justify-center text-port-accent shrink-0">
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[10px] text-port-faint uppercase tracking-wider mb-1.5">{title}</div>
                    {lines.map((line, j) => (
                      <div key={j} className="text-sm text-port-ink leading-relaxed">{line}</div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Social / quick links */}
              <div className="p-5 rounded-2xl border border-port-border bg-port-surface">
                <div className="text-[10px] text-port-faint uppercase tracking-wider mb-3">Follow Us</div>
                <div className="flex flex-wrap gap-2">
                  {['LinkedIn', 'Twitter / X', 'Instagram', 'Telegram'].map((name) => (
                    <span
                      key={name}
                      className="px-3 py-1.5 rounded-full border border-port-border text-xs text-port-soft hover:border-port-border-hi hover:text-port-ink transition-colors cursor-pointer"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
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
