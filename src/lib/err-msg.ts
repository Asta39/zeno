import { reportIfStale, STALE_ACTION_MESSAGE } from "./stale-action";

/**
 * Turn a thrown value into a message a user can act on. Every form's catch
 * goes through this, so a tab left open across a deploy shows "refresh the
 * page" instead of Next's raw 'Server Action "…" was not found' text — which
 * only a handful of forms handled before (the quote/invoice editor did not).
 */
export function errMsg(e: unknown, fallback = "Something went wrong"): string {
  if (reportIfStale(e)) return STALE_ACTION_MESSAGE;
  return e instanceof Error && e.message ? e.message : fallback;
}
