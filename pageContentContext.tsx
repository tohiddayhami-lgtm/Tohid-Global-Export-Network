import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface PageContent {
  siteTagline: string;
  // About Us
  aboutTitle: string;
  aboutSubtitle: string;
  aboutBody1: string;
  aboutBody2: string;
  aboutStat1Value: string;
  aboutStat1Label: string;
  aboutStat2Value: string;
  aboutStat2Label: string;
  aboutStat3Value: string;
  aboutStat3Label: string;
  // Services
  servicesTitle: string;
  servicesSubtitle: string;
  service1Title: string;
  service1Desc: string;
  service2Title: string;
  service2Desc: string;
  service3Title: string;
  service3Desc: string;
  service4Title: string;
  service4Desc: string;
  // Contact
  contactTitle: string;
  contactSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactHours: string;
}

export const DEFAULT_PAGE_CONTENT: PageContent = {
  siteTagline: 'Global Trade. Local Expertise.',
  aboutTitle: 'About Us',
  aboutSubtitle: 'Connecting Global Markets Since 2010',
  aboutBody1:
    'Tohid Dayhami Business Solutions Center is a premier global trade facilitation hub, dedicated to bridging businesses across international markets. With over a decade of expertise in export consulting and trade network management, we empower companies to expand their reach into new markets with confidence.',
  aboutBody2:
    'Our team of seasoned professionals provides comprehensive solutions — from market entry strategy and regulatory compliance to logistics optimization and partnership development. We specialize in connecting exporters with verified buyers and distributors across key global trade corridors including Iran, India, Turkey, UAE, China, Germany, and the UK.',
  aboutStat1Value: '10+',
  aboutStat1Label: 'Years of Experience',
  aboutStat2Value: '500+',
  aboutStat2Label: 'Trade Partners',
  aboutStat3Value: '20+',
  aboutStat3Label: 'Countries Served',
  servicesTitle: 'Our Services',
  servicesSubtitle: 'Comprehensive trade solutions for global business success',
  service1Title: 'Export Consulting',
  service1Desc:
    'Strategic guidance for entering new international markets, including market research, regulatory compliance, and export documentation support.',
  service2Title: 'Trade Network Access',
  service2Desc:
    'Connect with our verified network of importers, distributors, and trade partners across 10+ countries through our interactive Meta Port.',
  service3Title: 'Logistics & Freight',
  service3Desc:
    'End-to-end freight solutions including customs clearance, warehousing, and last-mile delivery coordination for global shipments.',
  service4Title: 'Business Matchmaking',
  service4Desc:
    'Personalized B2B matchmaking services to connect you with the right partners for your specific business goals and target markets.',
  contactTitle: 'Contact Us',
  contactSubtitle: 'Get in touch with our team of global trade experts',
  contactEmail: 'info@tohid-business.com',
  contactPhone: '+98 21 1234 5678',
  contactAddress: 'Tehran, Iran',
  contactHours: 'Saturday – Thursday: 9:00 AM – 5:00 PM',
};

const STORAGE_KEY = 'tdbsc_page_content_v1';

function load(): PageContent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PAGE_CONTENT };
    return { ...DEFAULT_PAGE_CONTENT, ...(JSON.parse(raw) as Partial<PageContent>) };
  } catch {
    return { ...DEFAULT_PAGE_CONTENT };
  }
}

type Ctx = {
  pageContent: PageContent;
  updatePageContent: (patch: Partial<PageContent>) => void;
};

const PageContentContext = createContext<Ctx | null>(null);

export function PageContentProvider({ children }: { children: ReactNode }) {
  const [pageContent, setPageContent] = useState<PageContent>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pageContent));
    } catch {
      /* quota */
    }
  }, [pageContent]);

  const updatePageContent = (patch: Partial<PageContent>) =>
    setPageContent((prev) => ({ ...prev, ...patch }));

  return (
    <PageContentContext.Provider value={{ pageContent, updatePageContent }}>
      {children}
    </PageContentContext.Provider>
  );
}

export function usePageContent() {
  const c = useContext(PageContentContext);
  if (!c) throw new Error('usePageContent must be used inside PageContentProvider');
  return c;
}
