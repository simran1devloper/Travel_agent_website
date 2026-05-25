/**
 * useContent(page) — fetches CMS content for a page and returns a safe accessor.
 *
 * Usage:
 *   const { c, isLoading } = useContent("home");
 *   c("hero", "title", "Default title")  // returns the CMS value or the fallback
 */
import { useQuery } from "@tanstack/react-query";
import { api, type ContentPage } from "./api";

export function useContent(page: string) {
  const { data, isLoading } = useQuery<ContentPage>({
    queryKey: ["content", page],
    queryFn: () => api.content(page),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  /** Get a content value with a fallback */
  function c(section: string, key: string, fallback = ""): string {
    return data?.[section]?.[key] ?? fallback;
  }

  return { c, data, isLoading };
}
