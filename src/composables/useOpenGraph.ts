/**
 * Composable for dynamic OpenGraph, Twitter Cards, and Document Meta tags.
 * Updates social card previews on route transitions and asynchronous data loading.
 */

export interface OpenGraphMeta {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
}

export function useOpenGraph() {
  function setMeta(meta: OpenGraphMeta) {
    if (typeof document === 'undefined') return;

    const appTitle = meta.title ? `${meta.title} — NEXT.g` : 'NEXT.g — Backlog & Ruleta Gamer';
    const appDesc =
      meta.description ||
      'Organiza tu backlog de videojuegos pendientes y elige tu próxima aventura al azar con la ruleta gamer comunitaria.';
    const appImage = meta.image || '/og-image.svg';
    const appUrl = meta.url || (typeof window !== 'undefined' ? window.location.href : '');

    // 1. Primary Page Title
    document.title = appTitle;

    const setOrCreateMeta = (attr: 'name' | 'property', key: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    // Standard Description
    setOrCreateMeta('name', 'description', appDesc);

    // OpenGraph
    setOrCreateMeta('property', 'og:title', appTitle);
    setOrCreateMeta('property', 'og:description', appDesc);
    setOrCreateMeta('property', 'og:image', appImage);
    setOrCreateMeta('property', 'og:url', appUrl);
    setOrCreateMeta('property', 'og:type', meta.type || 'website');

    // Twitter / X
    setOrCreateMeta('name', 'twitter:title', appTitle);
    setOrCreateMeta('name', 'twitter:description', appDesc);
    setOrCreateMeta('name', 'twitter:image', appImage);
    setOrCreateMeta('name', 'twitter:card', 'summary_large_image');
  }

  function resetMeta() {
    setMeta({
      title: 'NEXT.g — Backlog & Ruleta Gamer',
      description: 'Organiza tu backlog de videojuegos pendientes y elige tu próxima aventura al azar con la ruleta gamer comunitaria.',
      image: '/og-image.svg',
    });
  }

  return {
    setMeta,
    resetMeta,
  };
}
