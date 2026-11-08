import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  docNames,
  getResourceContent,
  getResourceDescription,
  resourceLanguages,
} from '@/lib/resources';
import ResourceArticle from '../ResourceArticle';

export async function generateStaticParams() {
  const buildLanguages = ['en', 'hi'] as const;
  const variants = Object.keys(docNames).flatMap((slug) =>
    buildLanguages.map((lang) => ({ slug, lang })),
  );

  for (const { slug, lang } of variants) {
    await getResourceContent(slug, lang);
  }

  return variants;
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; lang: string }>;
}): Promise<Metadata> {
  const { slug, lang } = await params;
  const documentName = docNames[slug];
  if (!documentName || !resourceLanguages.some((language) => language.code === lang)) {
    notFound();
  }

  const content = await getResourceContent(slug, lang);
  const canonical =
    `/resources/${encodeURIComponent(slug)}/${lang}`;
  const englishUrl = `https://draftee.in/resources/${encodeURIComponent(slug)}/en`;
  const hindiUrl = `https://draftee.in/resources/${encodeURIComponent(slug)}/hi`;
  return {
    title: `${documentName} Format`,
    description: getResourceDescription(content),
    robots: { index: lang === 'en' || lang === 'hi' },
    alternates: {
      canonical,
      languages: {
        en: englishUrl,
        hi: hindiUrl,
        'x-default': englishUrl,
      },
    },
  };
}

export default async function LocalizedResourcePage({
  params,
}: {
  params: Promise<{ slug: string; lang: string }>;
}) {
  const { slug, lang } = await params;
  if (!docNames[slug] || !resourceLanguages.some((language) => language.code === lang)) {
    notFound();
  }
  return <ResourceArticle slug={slug} lang={lang} />;
}
