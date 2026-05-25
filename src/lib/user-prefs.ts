/**
 * User-preference hooks backed by localStorage / sessionStorage.
 *
 * Features:
 *  1. Recently-viewed packages  — localStorage, max 8 entries
 *  2. Guest wishlist            — localStorage, survives logout
 *  3. Helpful-vote set          — localStorage, one vote per review per browser
 *  4. Booking form draft        — localStorage, auto-saved per keystroke
 *  5. Package filter / sort     — sessionStorage, reset on tab close
 *  6. Destination filter        — sessionStorage
 *  7. Admin active tab          — localStorage, remembers last admin tab
 *  8. Compare list              — sessionStorage, max 3 packages
 */

import { useCallback } from "react";
import { useLocalStorage, useSessionStorage, ls } from "./storage";

// ---------------------------------------------------------------------------
// 1. Recently-viewed packages
// ---------------------------------------------------------------------------

const MAX_RECENT = 8;

export interface RecentPackage {
  slug: string;
  title: string;
  image: string;
  price: number;
  days: number;
  viewedAt: number; // timestamp
}

export function useRecentlyViewed() {
  const [items, setItems] = useLocalStorage<RecentPackage[]>("jm_recently_viewed", []);

  const push = useCallback(
    (pkg: Omit<RecentPackage, "viewedAt">) => {
      setItems((prev) => {
        const filtered = prev.filter((p) => p.slug !== pkg.slug);
        const next: RecentPackage[] = [{ ...pkg, viewedAt: Date.now() }, ...filtered];
        return next.slice(0, MAX_RECENT);
      });
    },
    [setItems]
  );

  const clear = useCallback(() => setItems([]), [setItems]);

  return { items, push, clear };
}

// ---------------------------------------------------------------------------
// 2. Guest wishlist (localStorage, separate from the API wishlist)
// ---------------------------------------------------------------------------

export function useGuestWishlist() {
  const [slugs, setSlugs] = useLocalStorage<string[]>("jm_guest_wishlist", []);

  const toggle = useCallback(
    (slug: string) => {
      setSlugs((prev) =>
        prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
      );
    },
    [setSlugs]
  );

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const clear = useCallback(() => setSlugs([]), [setSlugs]);

  return { slugs, toggle, has, clear };
}

// ---------------------------------------------------------------------------
// 3. Helpful-vote set — persisted so users can't re-vote after refresh
// ---------------------------------------------------------------------------

export function useHelpfulVotes() {
  const [voted, setVoted] = useLocalStorage<string[]>("jm_helpful_votes", []);

  const markVoted = useCallback(
    (publicId: string) => {
      setVoted((prev) => (prev.includes(publicId) ? prev : [...prev, publicId]));
    },
    [setVoted]
  );

  const hasVoted = useCallback((publicId: string) => voted.includes(publicId), [voted]);

  return { hasVoted, markVoted };
}

// ---------------------------------------------------------------------------
// 4. Booking / inquiry form draft
// ---------------------------------------------------------------------------

export interface InquiryDraft {
  selectedDestinations: string[];
  selectedExperiences: string[];
  selectedStyles: string[];
  selectedBudget: string;
  selectedInspiration: string[];
  selectedServices: string[];
  adults: number;
  children: number;
  step: number;
  // Contact fields saved as plain strings
  full_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  preferred_contact?: string;
  specific_place?: string;
  preferred_dates?: string;
  passport_notes?: string;
  occasion?: string;
  trip_feel?: string;
  inspiration_links?: string;
  savedAt?: number;
}

const DRAFT_KEY = "jm_inquiry_draft";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function defaultDraft(): InquiryDraft {
  return {
    selectedDestinations: [],
    selectedExperiences: [],
    selectedStyles: [],
    selectedBudget: "",
    selectedInspiration: [],
    selectedServices: [],
    adults: 2,
    children: 0,
    step: 0,
  };
}

export function useInquiryDraft() {
  const [draft, setDraft, clearDraft] = useLocalStorage<InquiryDraft>(DRAFT_KEY, defaultDraft());

  // On mount, expire stale drafts
  const hasDraft =
    !!draft.savedAt &&
    Date.now() - draft.savedAt < DRAFT_TTL_MS &&
    draft.selectedDestinations.length > 0;

  const saveDraft = useCallback(
    (partial: Partial<InquiryDraft>) => {
      setDraft((prev) => ({ ...prev, ...partial, savedAt: Date.now() }));
    },
    [setDraft]
  );

  const resetDraft = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  return { draft, hasDraft, saveDraft, resetDraft };
}

// Plain helper for non-React contexts (e.g. form submit → clear draft)
export function clearInquiryDraft(): void {
  ls.remove(DRAFT_KEY);
}

// ---------------------------------------------------------------------------
// 5. Package list filter + sort (sessionStorage — resets on tab close)
// ---------------------------------------------------------------------------

export interface PackageFilterState {
  search: string;
  category: string;
  sort: "price-asc" | "price-desc" | "rating" | "days-asc" | "days-desc" | "";
  minDays: number;
  maxDays: number;
}

const defaultPackageFilter: PackageFilterState = {
  search: "",
  category: "all",
  sort: "",
  minDays: 0,
  maxDays: 90,
};

export function usePackageFilterState() {
  return useSessionStorage<PackageFilterState>("jm_pkg_filter", defaultPackageFilter);
}

// ---------------------------------------------------------------------------
// 6. Destination filter (sessionStorage)
// ---------------------------------------------------------------------------

export function useDestinationFilterState() {
  return useSessionStorage<string>("jm_dest_filter", "all");
}

// ---------------------------------------------------------------------------
// 7. Admin active tab (localStorage — survives refresh)
// ---------------------------------------------------------------------------

export type AdminTabKey =
  | "overview"
  | "packages"
  | "planners"
  | "content"
  | "offers"
  | "media"
  | "reviews"
  | "pages";

export function useAdminTabPref() {
  return useLocalStorage<AdminTabKey>("jm_admin_tab", "overview");
}

// ---------------------------------------------------------------------------
// 8. Package compare list (sessionStorage, max 3)
// ---------------------------------------------------------------------------

const MAX_COMPARE = 3;

export function useCompareList() {
  const [slugs, setSlugs] = useSessionStorage<string[]>("jm_compare", []);

  const toggle = useCallback(
    (slug: string) => {
      setSlugs((prev) => {
        if (prev.includes(slug)) return prev.filter((s) => s !== slug);
        if (prev.length >= MAX_COMPARE) return prev; // silently ignore if full
        return [...prev, slug];
      });
    },
    [setSlugs]
  );

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);
  const clear = useCallback(() => setSlugs([]), [setSlugs]);
  const isFull = slugs.length >= MAX_COMPARE;

  return { slugs, toggle, has, isFull, clear };
}
