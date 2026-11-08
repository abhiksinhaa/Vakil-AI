'use client';

import { useRouter } from 'next/navigation';
import { resourceLanguages } from '@/lib/resources';

export default function LanguageSelector({
  slug,
  lang,
}: {
  slug: string;
  lang: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm text-[#e8e0d0]/70">
        Language:
      </label>
      <select
        id="language-select"
        value={lang}
        onChange={(event) =>
          router.push(`/resources/${encodeURIComponent(slug)}?lang=${event.target.value}`)
        }
        className="bg-[#1a2333] border border-[#1e2a3a] text-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
      >
        {resourceLanguages.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
