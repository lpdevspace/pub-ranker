import { useEffect } from 'react';

/**
 * SEO — vanilla document.title + meta tag manager.
 * Avoids react-helmet to keep bundle small. Restores defaults on unmount.
 */
const DEFAULTS = {
    title: 'Pub Ranker — Stop arguing. Start ranking.',
    description: 'Rate, rank and map the best pubs in your city with your group. Free for mates, premium for pubs.',
    image: 'https://pubranker.uk/icon-512.png',
    type: 'website',
};

function setMeta(selector, attr, value) {
    let el = document.head.querySelector(selector);
    if (!el) {
        el = document.createElement('meta');
        const [k, v] = selector.replace(/[[\]"]/g, '').split('=');
        el.setAttribute(k, v);
        document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
}

export default function SEO({
    title,
    description = DEFAULTS.description,
    image = DEFAULTS.image,
    type = DEFAULTS.type,
    path = '',
    structuredData = null,
}) {
    useEffect(() => {
        const fullTitle = title ? `${title} · Pub Ranker` : DEFAULTS.title;
        document.title = fullTitle;

        const url = `https://pubranker.uk${path || (typeof window !== 'undefined' ? window.location.pathname : '')}`;

        setMeta('meta[name="description"]', 'content', description);

        // Open Graph
        setMeta('meta[property="og:title"]',       'content', fullTitle);
        setMeta('meta[property="og:description"]', 'content', description);
        setMeta('meta[property="og:image"]',       'content', image);
        setMeta('meta[property="og:url"]',         'content', url);
        setMeta('meta[property="og:type"]',        'content', type);
        setMeta('meta[property="og:site_name"]',   'content', 'Pub Ranker');

        // Twitter card
        setMeta('meta[name="twitter:card"]',        'content', 'summary_large_image');
        setMeta('meta[name="twitter:title"]',       'content', fullTitle);
        setMeta('meta[name="twitter:description"]', 'content', description);
        setMeta('meta[name="twitter:image"]',       'content', image);

        // Canonical
        let link = document.head.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            document.head.appendChild(link);
        }
        link.setAttribute('href', url);

        // Structured data (JSON-LD)
        let ld = document.head.querySelector('script[data-seo-jsonld="true"]');
        if (structuredData) {
            if (!ld) {
                ld = document.createElement('script');
                ld.type = 'application/ld+json';
                ld.setAttribute('data-seo-jsonld', 'true');
                document.head.appendChild(ld);
            }
            ld.textContent = JSON.stringify(structuredData);
        } else if (ld) {
            ld.remove();
        }
    }, [title, description, image, type, path, structuredData]);

    return null;
}
