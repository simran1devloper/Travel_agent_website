import { ls } from "./storage";

export interface HeroSearch {
  destination: string;
  dates: string;
  travelers: string;
  budget: string;
}

const KEY = "jm_hero_search";

export function saveHeroSearch(data: HeroSearch) {
  ls.set(KEY, data);
}

export function loadHeroSearch(): HeroSearch | null {
  return ls.get<HeroSearch | null>(KEY, null);
}

export function clearHeroSearch() {
  ls.remove(KEY);
}
