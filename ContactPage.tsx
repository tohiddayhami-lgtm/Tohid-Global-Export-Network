import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageCircle } from 'lucide-react';
import { usePageContent } from './pageContentContext.tsx';
import { useContactSubmissions } from './contactSubmissionsContext.tsx';
import PageHeader from './PageHeader.tsx';
import SeoHead from './SeoHead.tsx';

export default function ContactPage() {
  const { pageContent } = usePageContent();
  const { addSubmission } = useContactSubmissions();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const contactInfo = [
    { icon: Mail, label: 'Email', value: pageContent.contactEmail, href: `mailto:${pageContent.contactEmail}` },
    { icon: Phone, label: 'Phone', value: pageContent.contactPhone, href: `tel:${pageContent.contactPhone.replace(/\s/g, '')}` },
    { icon: MapPin, label: 'Address', value: pageContent.contactAddress, href: undefined },
    { icon: Clock, label: 'Business Hours', value: pageContent.contactHours, href: undefined },
  ];

  return (
    <div className="min-h-[100dvh] bg-port-bg text-port-ink font-sans flex flex-col overflow-x-hidden">
      <SeoHead pageTitle={pageContent.contactTitle} pageDescription={pageContent.seoContactDescription} />
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
              Get In Touch
            </div>
            <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] leading-[0.9] tracking-tight mb-4">
              <span className="block text-port-ink">{pageContent.contactTitle}</span>
            </h1>
            <p className="text-port-soft text-lg mt-4 leading-relaxed">{pageContent.contactSubtitle}</p>
          </motion.div>
        </section>

        {/* Contact Info + Form */}
        <section className="py-8 px-6 mb-12">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Contact Details */}
            <div className="space-y-3">
              <h2 className="font-serif text-xl text-port-ink mb-5">Contact Information</h2>
              {contactInfo.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.32 }}
                    className="flex items-start gap-4 p-4 rounded-xl border border-port-border bg-port-surface port-card-glow"
                  >
                    <div className="w-10 h-10 rounded-xl bg-port-accent-bg border border-port-accent-border flex items-center justify-center text-port-accent shrink-0">
                      <Icon className="w-4.5 h-4.5" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-port-faint uppercase tracking-wider mb-0.5">{item.label}</p>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-[14px] text-port-ink hover:text-port-accent transition-colors truncate block"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-[14px] text-port-ink">{item.value}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="p-6 rounded-2xl border border-port-border bg-port-surface relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-port-accent/30 to-transparent" />
              <h2 className="font-serif text-xl text-port-ink mb-5">Send a Message</h2>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-port-accent-bg border border-port-accent/30 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-port-accent" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-semibold text-port-ink text-base">Message Sent!</p>
                    <p className="text-port-soft text-sm mt-1">We will get back to you as soon as possible.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-[13px] text-port-accent hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const data = new FormData(form);
                    setSubmitting(true);
                    try {
                      await addSubmission({
                        name:     String(data.get('name')     ?? '').trim(),
                        email:    String(data.get('email')    ?? '').trim(),
                        phone:    String(data.get('phone')    ?? '').trim(),
                        whatsapp: String(data.get('whatsapp') ?? '').trim(),
                        subject:  String(data.get('subject')  ?? '').trim(),
                        message:  String(data.get('message')  ?? '').trim(),
                      });
                      form.reset();
                      setSubmitted(true);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {/* Name + Email */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="col-span-2 sm:col-span-1 block text-xs">
                      <span className="text-port-soft mb-1 block">Full Name *</span>
                      <input
                        name="name"
                        required
                        placeholder="Your name"
                        className="w-full rounded-lg border border-port-border bg-port-bg px-3 py-2.5 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                      />
                    </label>
                    <label className="col-span-2 sm:col-span-1 block text-xs">
                      <span className="text-port-soft mb-1 block">Email *</span>
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder="your@email.com"
                        className="w-full rounded-lg border border-port-border bg-port-bg px-3 py-2.5 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                      />
                    </label>
                  </div>

                  {/* Phone + WhatsApp */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="col-span-2 sm:col-span-1 block text-xs">
                      <span className="text-port-soft mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Phone Number
                      </span>
                      <input
                        name="phone"
                        type="tel"
                        placeholder="+98 912 345 6789"
                        className="w-full rounded-lg border border-port-border bg-port-bg px-3 py-2.5 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                      />
                    </label>
                    <label className="col-span-2 sm:col-span-1 block text-xs">
                      <span className="text-port-soft mb-1 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-green-400" /> WhatsApp Number
                      </span>
                      <input
                        name="whatsapp"
                        type="tel"
                        placeholder="+98 912 345 6789"
                        className="w-full rounded-lg border border-port-border bg-port-bg px-3 py-2.5 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                      />
                    </label>
                  </div>

                  {/* Subject */}
                  <label className="block text-xs">
                    <span className="text-port-soft mb-1 block">Subject</span>
                    <input
                      name="subject"
                      placeholder="How can we help?"
                      className="w-full rounded-lg border border-port-border bg-port-bg px-3 py-2.5 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors"
                    />
                  </label>

                  {/* Message */}
                  <label className="block text-xs">
                    <span className="text-port-soft mb-1 block">Message *</span>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      placeholder="Tell us about your needs..."
                      className="w-full rounded-lg border border-port-border bg-port-bg px-3 py-2.5 text-sm text-port-ink placeholder:text-port-faint focus:outline-none focus:border-port-accent/50 transition-colors resize-none"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-port-accent text-port-bg font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <Send className="w-4 h-4" strokeWidth={1.5} />
                    {submitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-port-border px-6 py-6 text-center text-[12px] text-port-faint">
        © {new Date().getFullYear()} Tohid Dayhami Business Solutions Center · All rights reserved
      </footer>
    </div>
  );
}
