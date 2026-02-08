import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/project/'] },
    sitemap: 'https://plan-crft-mvp-ot41.vercel.app/sitemap.xml',
  };
}
