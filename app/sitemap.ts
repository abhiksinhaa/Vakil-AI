import type { MetadataRoute } from 'next';
import { docNames } from '@/lib/resources';

const publicRoutes = [
  '/',
  '/pricing',
  '/resources',
  '/legal-insights',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = publicRoutes.map((route) => ({
    url: `https://draftee.in${route}`,
  }));
  const resourcePages = Object.keys(docNames).flatMap((slug) =>
    ['en', 'hi'].map((lang) => ({
      url: `https://draftee.in/resources/${encodeURIComponent(slug)}/${lang}`,
    })),
  );

  return [...staticPages, ...resourcePages];
}
