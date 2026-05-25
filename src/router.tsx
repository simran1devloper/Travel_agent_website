import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// ---------------------------------------------------------------------------
// Cache lifetime constants (milliseconds)
// ---------------------------------------------------------------------------
const S = 1_000;
const MIN = 60 * S;

/**
 * How long data is considered "fresh" before a background re-fetch is triggered.
 * During staleTime a component mounting will NOT fire a network request — it
 * reads straight from cache. After staleTime the cache is shown instantly
 * while a background refresh runs (stale-while-revalidate).
 *
 * gcTime (formerly cacheTime) is how long unused data stays in memory.
 */
const STALE = {
  /** CMS content that almost never changes: FAQs, testimonials, site-stats, services */
  static: 10 * MIN,
  /** Catalogue data that changes occasionally: packages, destinations, offers */
  catalogue: 5 * MIN,
  /** User-specific data: dashboard, wishlist, reviews */
  user: 1 * MIN,
  /** Admin data — should feel fresh but tolerate a 30-second lag */
  admin: 30 * S,
} as const;

const GC = {
  static: 30 * MIN,
  catalogue: 15 * MIN,
  user: 5 * MIN,
  admin: 2 * MIN,
} as const;

/**
 * Per-queryKey stale/gc overrides.
 * The QueryClient picks the first matching prefix.
 */
export const QUERY_CONFIG: Record<
  string,
  { staleTime: number; gcTime: number }
> = {
  // CMS / static
  "site-stats":    { staleTime: STALE.static,    gcTime: GC.static },
  faqs:            { staleTime: STALE.static,    gcTime: GC.static },
  testimonials:    { staleTime: STALE.static,    gcTime: GC.static },
  services:        { staleTime: STALE.static,    gcTime: GC.static },

  // Catalogue
  packages:        { staleTime: STALE.catalogue, gcTime: GC.catalogue },
  destinations:    { staleTime: STALE.catalogue, gcTime: GC.catalogue },
  offers:          { staleTime: STALE.catalogue, gcTime: GC.catalogue },
  reviews:         { staleTime: STALE.catalogue, gcTime: GC.catalogue },
  "review-stats":  { staleTime: STALE.catalogue, gcTime: GC.catalogue },
  planners:        { staleTime: STALE.catalogue, gcTime: GC.catalogue },

  // User-specific
  dashboard:       { staleTime: STALE.user,      gcTime: GC.user },
  wishlist:        { staleTime: STALE.user,       gcTime: GC.user },

  // Admin (prefix "admin-" catches all admin-* keys via defaultOptions fallback)
};

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Sensible network defaults
        retry: 1,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
        // Don't re-fetch just because the user switched tabs — saves API calls
        refetchOnWindowFocus: false,
        // Default stale/gc for anything not in QUERY_CONFIG (e.g. admin-* queries)
        staleTime: STALE.admin,
        gcTime: GC.admin,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  // Apply per-key stale/gc overrides via the query cache observer
  const originalSetDefaults = queryClient.setQueryDefaults.bind(queryClient);
  Object.entries(QUERY_CONFIG).forEach(([key, opts]) => {
    originalSetDefaults([key], opts);
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Use the per-key stale times for route preloading too
    defaultPreloadStaleTime: STALE.catalogue,
  });

  return router;
};
