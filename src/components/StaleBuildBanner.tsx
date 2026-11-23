"use client";

import { useEffect, useState } from "react";
import { STALE_BUILD_EVENT } from "@/lib/stale-action";

/** Shown once this tab learns it runs an old build (any server action
 *  failed with "not found"). No auto-reload: the user may be mid-quote. */
export function StaleBuildBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const on = () => setStale(true);
    window.addEventListener(STALE_BUILD_EVENT, on);
    return () => window.removeEventListener(STALE_BUILD_EVENT, on);
  }, []);

  if (!stale) return null;
  return (
    <div role="status" className="no-print fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-amber-100 px-4 py-2 text-center text-[13px] font-medium text-amber-900 shadow-sm">
      <span>Zeno was updated. Save or copy anything you&apos;re typing, then refresh to keep working.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-md bg-amber-900 px-3 py-1 text-[12.5px] font-semibold text-white hover:bg-amber-950"
      >
        Refresh
      </button>
    </div>
  );
}
