'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { isFlashSaleActive } from '../lib/flashSale';

export default function FlashSaleBanner() {
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const update = () => setActive(isFlashSaleActive());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!active || dismissed) return null;

  return (
    <div className="relative z-[60] flex min-h-11 items-center justify-center gap-3 bg-[#d4af37] px-12 py-2 text-center text-sm font-semibold text-[#17130a]">
      <Link href="/pricing" className="hover:underline">
        ⚡ FLASH SALE — Pro plan at ₹199/mo today only! Offer ends at 11:59 PM
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#17130a] hover:opacity-70"
        aria-label="Dismiss flash sale banner"
      >
        <X size={18} />
      </button>
    </div>
  );
}