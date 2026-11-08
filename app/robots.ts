import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api',
        '/dashboard',
        '/generate',
        '/documents',
        '/history',
        '/firm',
        '/profile',
        '/matters',
        '/library',
        '/refer',
        '/settings',
        '/tasks',
        '/draft',
        '/workspace',
        '/upload',
        '/research',
      ],
    },
    sitemap: 'https://draftee.in/sitemap.xml',
  };
}
