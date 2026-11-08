import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  docNames,
  getResourceContent,
  getResourceDescription,
} from '@/lib/resources';
import ResourceArticle from './ResourceArticle';

export async function generateStaticParams() {
  return Object.keys(docNames).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const documentName = docNames[slug];
  if (!documentName) notFound();

  const content = await getResourceContent(slug, 'en');
  const encodedSlug = encodeURIComponent(slug);
  const englishUrl = `https://draftee.in/resources/${encodedSlug}/en`;
  return {
    title: `${documentName} Format`,
    description: getResourceDescription(content),
    alternates: {
      canonical: englishUrl,
      languages: {
        en: englishUrl,
        hi: `https://draftee.in/resources/${encodedSlug}/hi`,
        'x-default': englishUrl,
      },
    },
  };
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!docNames[slug]) notFound();
  return <ResourceArticle slug={slug} lang="en" />;
}
