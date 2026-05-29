import { useEffect } from 'react';
import { usePageContent } from './pageContentContext.tsx';

function setMetaName(name: string, content: string) {
  if (!content) return;
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setMetaProp(property: string, content: string) {
  if (!content) return;
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLinkCanonical(href: string) {
  if (!href) return;
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function injectGaScript(gaId: string) {
  if (!gaId || document.getElementById('ga-script')) return;
  const s1 = document.createElement('script');
  s1.id = 'ga-script';
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(s1);
  const s2 = document.createElement('script');
  s2.id = 'ga-init';
  s2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`;
  document.head.appendChild(s2);
}

interface SeoHeadProps {
  /** Page-specific title. Final title: "Page Title | Site Title" */
  pageTitle?: string;
  /** Page-specific description override */
  pageDescription?: string;
}

export default function SeoHead({ pageTitle, pageDescription }: SeoHeadProps) {
  const { pageContent } = usePageContent();

  useEffect(() => {
    const sep = pageContent.seoSeparator || '|';
    const siteTitle = pageContent.seoSiteTitle || 'Tohid Dayhami Business Solutions Center';
    const fullTitle = pageTitle ? `${pageTitle} ${sep} ${siteTitle}` : siteTitle;
    const description = pageDescription || pageContent.seoDescription;
    const ogTitle = pageContent.seoOgTitle || siteTitle;
    const ogDesc = pageContent.seoOgDescription || description;

    document.title = fullTitle;

    // Standard meta
    setMetaName('description', description);
    setMetaName('keywords', pageContent.seoKeywords);
    setMetaName('author', pageContent.seoAuthor);
    setMetaName('application-name', siteTitle);

    // Open Graph
    setMetaProp('og:title', pageTitle ? fullTitle : ogTitle);
    setMetaProp('og:description', pageTitle ? description : ogDesc);
    setMetaProp('og:image', pageContent.seoOgImageUrl);
    setMetaProp('og:type', 'website');
    if (pageContent.seoSiteUrl) setMetaProp('og:url', pageContent.seoSiteUrl);

    // Twitter
    setMetaName('twitter:card', pageContent.seoTwitterCard || 'summary_large_image');
    setMetaName('twitter:title', pageTitle ? fullTitle : ogTitle);
    setMetaName('twitter:description', pageTitle ? description : ogDesc);
    if (pageContent.seoOgImageUrl) setMetaName('twitter:image', pageContent.seoOgImageUrl);
    if (pageContent.seoTwitterSite) setMetaName('twitter:site', pageContent.seoTwitterSite);

    // Canonical
    if (pageContent.seoSiteUrl) {
      setLinkCanonical(pageContent.seoSiteUrl + (window.location.pathname === '/' ? '' : window.location.pathname));
    }

    // Google Analytics (one-time injection)
    if (pageContent.seoGaId) injectGaScript(pageContent.seoGaId);
  }, [pageContent, pageTitle, pageDescription]);

  return null;
}
