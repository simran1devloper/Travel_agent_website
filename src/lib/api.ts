export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const CUSTOMER_TOKEN = import.meta.env.VITE_CUSTOMER_TOKEN ?? "dev-customer-token";
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN ?? "dev-admin-token";

// Warn in console if dev tokens are being used in production
if (import.meta.env.PROD) {
  if (CUSTOMER_TOKEN === "dev-customer-token") {
    console.error("[JourneyMakers] SECURITY WARNING: VITE_CUSTOMER_TOKEN is using the default dev value in production build.");
  }
  if (!import.meta.env.VITE_ADMIN_TOKEN) {
    console.error("[JourneyMakers] SECURITY WARNING: VITE_ADMIN_TOKEN is not set in production build.");
  }
}

let accessTokenGetter: (() => Promise<string | undefined>) | undefined;

export function setAccessTokenGetter(getter: (() => Promise<string | undefined>) | undefined) {
  accessTokenGetter = getter;
}

type RequestOptions = RequestInit & {
  admin?: boolean;
  customer?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const accessToken = accessTokenGetter ? await accessTokenGetter() : undefined;

  if (!(options.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  } else {
    if (options.admin) headers.set("x-admin-token", ADMIN_TOKEN);
    if (options.customer) headers.set("x-customer-token", CUSTOMER_TOKEN);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json() as { detail?: string | { msg: string; loc?: string[] }[] };
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        // Pydantic validation errors
        detail = body.detail
          .map((e) => {
            const field = e.loc?.slice(1).join(".") ?? "field";
            return `${field}: ${e.msg}`;
          })
          .join("; ");
      }
    } catch {
      const text = await response.clone().text().catch(() => "");
      if (text) detail = text;
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export type ContentPage = Record<string, Record<string, string>>;
// { section: { key: value } }

export interface ContentUpdate {
  page: string;
  section: string;
  key: string;
  value: string;
}

export type AuthResponse = {
  token: string;
  role: string;
  name: string;
};

export type InquiryPayload = {
  full_name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  preferred_contact?: string;
  destinations: string[];
  specific_place?: string;
  experiences: string[];
  travel_styles: string[];
  services: string[];
  preferred_dates?: string;
  adults: number;
  children: number;
  budget?: string;
  passport_notes?: string;
  occasion?: string;
  inspiration: string[];
  inspiration_links?: string;
  trip_feel?: string;
};

export type ContactPayload = {
  name: string;
  contact: string;
  destination?: string;
  message: string;
  journey_types: string[];
};

export type ApiInquiry = {
  public_id: string;
  full_name: string;
  email: string;
  destinations: string[];
  budget?: string;
  status: string;
  created_at: string;
  assigned_planner_id?: number | null;
  planner_name?: string | null;
};

export type ApiPackage = {
  slug: string;
  title: string;
  location: string;
  days: number;
  price: number;
  category?: string;
  image_url?: string;
  tagline?: string;
  description?: string;
  rating?: number;
  review_count: number;
  published?: boolean;
};

export type PackagePayload = {
  slug: string;
  title: string;
  location: string;
  days: number;
  price: number;
  category?: string;
  image_url?: string;
  tagline?: string;
  description?: string;
  published?: boolean;
};

export type DestinationPayload = {
  slug: string;
  name: string;
  image_url?: string;
  packages_count?: number;
  tagline?: string;
  duration?: string;
  price?: number;
};

export type ApiDestination = {
  slug: string;
  name: string;
  image_url?: string;
  packages_count: number;
  tagline?: string;
  duration?: string;
  price?: number;
  rating?: number;
  review_count: number;
  gallery?: ApiGalleryItem[];
};

export type ApiGalleryItem = {
  type: "photo" | "video";
  src: string;
  caption: string;
  author: string;
};

export type AdminStats = {
  active_leads: number;
  customers: number;
  revenue_mtd: number;
  conversion: number;
};

export type ApiMedia = {
  id: number;
  filename: string;
  url: string;
  content_type: string;
  size_bytes: number;
  alt_text?: string;
  owner_type?: string;
  owner_id?: number;
  owner_slug?: string;
  created_at: string;
};

export type AdminMediaPage = {
  items: ApiMedia[];
  total: number;
  page: number;
  pages: number;
};

export type AdminReview = {
  id: number;
  public_id: string;
  customer_id: number;
  customer_name: string;
  package_slug: string;
  package_title?: string;
  rating: number;
  body: string;
  status: string;
  flag_reason?: string;
  media_urls: string[];
  created_at: string;
  updated_at?: string;
};

export type ApiPlanner = {
  id: number;
  name: string;
  email: string;
  specialty?: string;
  photo_url?: string;
  created_at: string;
};

export type PlannerPayload = {
  name: string;
  email: string;
  specialty?: string;
  photo_url?: string;
};

export type ApiReview = {
  id: number;
  public_id: string;
  customer_id: number;
  package_slug: string;
  rating: number;
  title: string;
  body: string;
  trip_date?: string;
  helpful_count: number;
  admin_reply?: string;
  verified: boolean;
  status: string;
  media_urls: string[];
  created_at: string;
  customer_name?: string;
  package_title?: string;
};

export type ApiOffer = {
  id: number;
  title: string;
  subtitle: string;
  code?: string;
  description: string;
  offer_type: "percent" | "fixed" | "free_upgrade" | "flash";
  discount_value: number;
  badge_label: string;
  badge_color: "accent" | "red" | "green" | "gold";
  applies_to: string;
  valid_from?: string;
  valid_until?: string;
  max_uses?: number;
  current_uses: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type OfferPayload = {
  title: string;
  subtitle?: string;
  code?: string;
  description?: string;
  offer_type: "percent" | "fixed" | "free_upgrade" | "flash";
  discount_value: number;
  badge_label?: string;
  badge_color?: "accent" | "red" | "green" | "gold";
  applies_to?: string;
  valid_from?: string;
  valid_until?: string;
  max_uses?: number;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
};

export type ApiReviewStats = {
  average: number;
  total: number;
  breakdown: { 1: number; 2: number; 3: number; 4: number; 5: number };
};

export type ApiMemory = {
  id: number;
  public_id: string;
  customer_id: number;
  title: string;
  description?: string;
  destination?: string;
  travel_date_from?: string;
  travel_date_to?: string;
  is_public: boolean;
  status: string;
  media_urls: string[];
  created_at: string;
  customer_name?: string;
};

export type ApiService = {
  id: string;
  name: string;
  description: string;
  rating: number;
  review_count: number;
  highlight: string;
  gallery: ApiGalleryItem[];
  sort_order: number;
};

export type ServicePayload = {
  id: string;
  name: string;
  description?: string;
  rating?: number;
  review_count?: number;
  highlight?: string;
  gallery?: ApiGalleryItem[];
  sort_order?: number;
};

export type ApiFaq = {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
};

export type FaqPayload = {
  question: string;
  answer: string;
  sort_order?: number;
};

export type ApiTestimonial = {
  id: number;
  name: string;
  role: string;
  quote: string;
  location: string;
  sort_order: number;
};

export type TestimonialPayload = {
  name: string;
  role: string;
  quote: string;
  location?: string;
  sort_order?: number;
};

export type ApiSiteStat = {
  id: number;
  value: string;
  label: string;
  sort_order: number;
};

export type SiteStatPayload = {
  value: string;
  label: string;
  sort_order?: number;
};

export type ReviewPayload = {
  rating: number;
  title?: string;
  body: string;
  trip_date?: string;
  media_urls?: string[];
};

export type MemoryPayload = {
  title: string;
  description?: string;
  destination?: string;
  travel_date_from?: string;
  travel_date_to?: string;
  is_public?: boolean;
  media_urls?: string[];
};

export type DashboardPayload = {
  customer: { name: string; email: string };
  inquiries: ApiInquiry[];
  wishlist: ApiPackage[];
  reviews: ApiReview[];
  memories: ApiMemory[];
};

export const api = {
  // Auth
  signup: (payload: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request<{ id: string; email: string; name: string; role: string }>("/auth/me"),

  createInquiry: (payload: InquiryPayload) =>
    request<{ id: string; status: string; message: string }>("/inquiries", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createContact: (payload: ContactPayload) =>
    request<{ id: string; status: string; message: string }>("/contacts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  packages: () => request<ApiPackage[]>("/packages"),
  destinations: () => request<ApiDestination[]>("/destinations"),

  // Admin packages
  adminPackages: () => request<ApiPackage[]>("/packages?include_unpublished=true", { admin: true }),
  adminCreatePackage: (payload: PackagePayload) =>
    request<{ slug: string }>("/packages", {
      method: "POST",
      admin: true,
      body: JSON.stringify(payload),
    }),
  adminUpdatePackage: (slug: string, payload: PackagePayload) =>
    request<{ slug: string }>(`/packages/${slug}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify(payload),
    }),
  adminDeletePackage: (slug: string) =>
    request<{ deleted: string }>(`/packages/${slug}`, { method: "DELETE", admin: true }),

  // Admin destinations
  adminCreateDestination: (payload: DestinationPayload) =>
    request<{ slug: string }>("/destinations", {
      method: "POST",
      admin: true,
      body: JSON.stringify(payload),
    }),
  adminUpdateDestination: (slug: string, payload: DestinationPayload) =>
    request<{ slug: string }>(`/destinations/${slug}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify(payload),
    }),
  adminDeleteDestination: (slug: string) =>
    request<{ deleted: string }>(`/destinations/${slug}`, { method: "DELETE", admin: true }),
  adminStats: () => request<AdminStats>("/admin/stats", { admin: true }),
  adminInquiries: () => request<ApiInquiry[]>("/admin/inquiries", { admin: true }),
  dashboard: () => request<DashboardPayload>("/dashboard", { customer: true }),
  saveWishlist: (package_slug: string) =>
    request<{ saved: string }>("/wishlist", {
      method: "POST",
      customer: true,
      body: JSON.stringify({ package_slug }),
    }),

  // Admin media
  adminListMedia: (page = 1) =>
    request<AdminMediaPage>(`/admin/media?page=${page}&per_page=20`, { admin: true }),
  adminUpdateMedia: (
    id: number,
    payload: { alt_text?: string; owner_type?: string; owner_slug?: string },
  ) =>
    request<{ id: number }>(`/admin/media/${id}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify(payload),
    }),
  adminDeleteMedia: (id: number) =>
    request<{ deleted: number }>(`/admin/media/${id}`, { method: "DELETE", admin: true }),

  // Admin reviews
  adminListReviews: (status?: string) =>
    request<AdminReview[]>(`/admin/reviews${status ? `?status=${status}` : ""}`, { admin: true }),
  adminUpdateReview: (
    publicId: string,
    payload: { status?: string; body?: string; flag_reason?: string },
  ) =>
    request<{ id: string; status: string }>(`/admin/reviews/${publicId}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify(payload),
    }),
  adminDeleteReview: (publicId: string) =>
    request<{ deleted: string }>(`/admin/reviews/${publicId}`, { method: "DELETE", admin: true }),
  adminBulkReviews: (publicIds: string[], action: "approve" | "reject") =>
    request<{ updated: number; status: string }>("/admin/reviews/bulk", {
      method: "POST",
      admin: true,
      body: JSON.stringify({ public_ids: publicIds, action }),
    }),

  // Planners
  listPlanners: () => request<ApiPlanner[]>("/planners"),
  createPlanner: (payload: PlannerPayload) =>
    request<{ id: number; name: string }>("/planners", {
      method: "POST",
      admin: true,
      body: JSON.stringify(payload),
    }),
  updatePlanner: (id: number, payload: PlannerPayload) =>
    request<{ id: number }>(`/planners/${id}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify(payload),
    }),
  deletePlanner: (id: number) =>
    request<{ deleted: number }>(`/planners/${id}`, { method: "DELETE", admin: true }),

  // Reviews
  getPackageReviews: (slug: string) => request<ApiReview[]>(`/packages/${slug}/reviews`),
  getPackageReviewStats: (slug: string) => request<ApiReviewStats>(`/packages/${slug}/reviews/stats`),
  getAllReviews: () => request<ApiReview[]>("/reviews"),
  markReviewHelpful: (publicId: string) => request<{ helpful_count: number }>(`/reviews/${publicId}/helpful`, { method: "POST" }),
  submitReview: (slug: string, payload: ReviewPayload) =>
    request<{ id: string; status: string }>(`/packages/${slug}/reviews`, {
      method: "POST",
      customer: true,
      body: JSON.stringify(payload),
    }),
  deleteReview: (publicId: string) =>
    request<{ deleted: string }>(`/reviews/${publicId}`, {
      method: "DELETE",
      customer: true,
    }),

  // Offers
  offers: () => request<ApiOffer[]>("/offers"),
  adminOffers: () => request<ApiOffer[]>("/admin/offers", { admin: true }),
  adminCreateOffer: (payload: OfferPayload) => request<ApiOffer>("/admin/offers", { method: "POST", admin: true, body: JSON.stringify(payload) }),
  adminUpdateOffer: (id: number, payload: Partial<OfferPayload>) => request<ApiOffer>(`/admin/offers/${id}`, { method: "PATCH", admin: true, body: JSON.stringify(payload) }),
  adminDeleteOffer: (id: number) => request<{ deleted: number }>(`/admin/offers/${id}`, { method: "DELETE", admin: true }),
  adminReplyToReview: (publicId: string, reply: string) => request<{ id: string; admin_reply: string }>(`/admin/reviews/${publicId}/reply`, { method: "POST", admin: true, body: JSON.stringify({ reply }) }),
  adminVerifyReview: (publicId: string) => request<{ id: string; verified: boolean }>(`/admin/reviews/${publicId}/verify`, { method: "PATCH", admin: true }),
  recordOfferUse: (id: number) => request<void>(`/offers/${id}/use`, { method: "POST" }),

  // Memories
  getPublicMemories: () => request<ApiMemory[]>("/memories"),
  getUserMemories: () => request<ApiMemory[]>("/user/memories", { customer: true }),
  createMemory: (payload: MemoryPayload) =>
    request<{ id: string; status: string }>("/user/memories", {
      method: "POST",
      customer: true,
      body: JSON.stringify(payload),
    }),
  updateMemory: (publicId: string, payload: Partial<MemoryPayload>) =>
    request<{ id: string }>(`/user/memories/${publicId}`, {
      method: "PATCH",
      customer: true,
      body: JSON.stringify(payload),
    }),
  deleteMemory: (publicId: string) =>
    request<{ deleted: string }>(`/user/memories/${publicId}`, {
      method: "DELETE",
      customer: true,
    }),

  // ── CMS: Services ────────────────────────────────────────────────────────
  services: () => request<ApiService[]>("/services"),
  createService: (payload: ServicePayload) =>
    request<ApiService>("/services", {
      method: "POST",
      admin: true,
      body: JSON.stringify(payload),
    }),
  updateService: (id: string, payload: Partial<ServicePayload>) =>
    request<ApiService>(`/services/${id}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify(payload),
    }),
  deleteService: (id: string) =>
    request<{ deleted: string }>(`/services/${id}`, { method: "DELETE", admin: true }),

  // ── CMS: FAQs ────────────────────────────────────────────────────────────
  faqs: () => request<ApiFaq[]>("/faqs"),
  createFaq: (payload: FaqPayload) =>
    request<ApiFaq>("/faqs", {
      method: "POST",
      admin: true,
      body: JSON.stringify(payload),
    }),
  updateFaq: (id: number, payload: Partial<FaqPayload>) =>
    request<ApiFaq>(`/faqs/${id}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify(payload),
    }),
  deleteFaq: (id: number) =>
    request<{ deleted: number }>(`/faqs/${id}`, { method: "DELETE", admin: true }),

  // ── CMS: Testimonials ─────────────────────────────────────────────────────
  testimonials: () => request<ApiTestimonial[]>("/testimonials"),
  createTestimonial: (payload: TestimonialPayload) =>
    request<ApiTestimonial>("/testimonials", {
      method: "POST",
      admin: true,
      body: JSON.stringify(payload),
    }),
  updateTestimonial: (id: number, payload: Partial<TestimonialPayload>) =>
    request<ApiTestimonial>(`/testimonials/${id}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify(payload),
    }),
  deleteTestimonial: (id: number) =>
    request<{ deleted: number }>(`/testimonials/${id}`, { method: "DELETE", admin: true }),

  // ── CMS: Site Stats ───────────────────────────────────────────────────────
  siteStats: () => request<ApiSiteStat[]>("/site-stats"),
  updateSiteStats: (items: SiteStatPayload[]) =>
    request<ApiSiteStat[]>("/site-stats", {
      method: "PUT",
      admin: true,
      body: JSON.stringify(items),
    }),
  updateSiteStat: (id: number, payload: SiteStatPayload) =>
    request<ApiSiteStat>(`/site-stats/${id}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify(payload),
    }),

  // User media upload (returns URL)
  uploadUserMedia: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText) as { id: number; url: string };
          resolve(data.url);
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Upload network error")));
      xhr.open("POST", `${API_BASE_URL}/user/media`);
      xhr.setRequestHeader("x-customer-token", CUSTOMER_TOKEN);
      xhr.send(form);
    });
  },

  uploadUserMediaWithProgress: (file: File, onProgress: (pct: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText) as { id: number; url: string };
          resolve(data.url);
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Upload network error")));
      xhr.open("POST", `${API_BASE_URL}/user/media`);
      xhr.setRequestHeader("x-customer-token", CUSTOMER_TOKEN);
      xhr.send(form);
    });
  },

  // ── Bulk import / export / templates ─────────────────────────────────────
  /** Returns a public URL for the template CSV — no auth headers needed. */
  csvTemplateUrl: (kind: string) => `${API_BASE_URL}/admin/templates/${kind}.csv`,

  /** Download a CSV export of all rows for an entity type.
   *  Triggers a browser file download (uses an <a> with the auth header via XHR blob). */
  adminExportCsv: (kind: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `${API_BASE_URL}/admin/export/${kind}.csv`);
      xhr.setRequestHeader("x-admin-token", ADMIN_TOKEN);
      xhr.responseType = "blob";
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const url = URL.createObjectURL(xhr.response as Blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${kind}_export.csv`;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        } else {
          reject(new Error(`Export failed: ${xhr.status}`));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Export network error")));
      xhr.send();
    });
  },

  /** Upload a CSV file and import rows for the given entity type.
   *  Returns { imported, errors } where errors is a list of { row, message } objects. */
  adminImportCsv: (kind: string, file: File): Promise<{ imported: number; errors: { row: number; message: string }[] }> => {
    const form = new FormData();
    form.append("file", file);
    return request(`/admin/import/${kind}`, {
      method: "POST",
      admin: true,
      body: form,
    });
  },

  // Content CMS
  content: (page: string) => request<ContentPage>(`/content/${page}`),
  adminContent: () => request<Record<string, Record<string, Record<string, { value: string; label: string; value_type: string; sort_order: number }>>>>("/admin/content", { admin: true }),
  adminUpdateContent: (updates: ContentUpdate[]) =>
    request<{ updated: number }>("/admin/content", {
      method: "PATCH",
      admin: true,
      body: JSON.stringify({ updates }),
    }),

  /** Export inquiries as CSV (existing endpoint). */
  adminExportInquiriesCsv: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `${API_BASE_URL}/admin/inquiries.csv`);
      xhr.setRequestHeader("x-admin-token", ADMIN_TOKEN);
      xhr.responseType = "blob";
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const url = URL.createObjectURL(xhr.response as Blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "inquiries_export.csv";
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        } else {
          reject(new Error(`Export failed: ${xhr.status}`));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Export network error")));
      xhr.send();
    });
  },

  updateInquiry: (publicId: string, payload: { status?: string; assigned_planner_id?: number | null }) =>
    request<{ id: string; status: string }>(`/admin/inquiries/${publicId}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify(payload),
    }),

  // ── Bulk select operations ────────────────────────────────────────────────
  /** Delete multiple entities by ID/slug. IDs are strings; the backend coerces
   *  integer IDs (planners, faqs, testimonials) automatically. */
  adminBulkDelete: (kind: string, ids: string[]) =>
    request<{ deleted: number; errors: { id: string; message: string }[] }>(
      `/admin/bulk-delete/${kind}`,
      { method: "POST", admin: true, body: JSON.stringify({ ids }) },
    ),

  /** Bulk-update status of multiple inquiries. */
  adminBulkUpdateInquiries: (publicIds: string[], status: string) =>
    request<{ updated: number; errors: { id: string; message: string }[] }>(
      "/admin/inquiries/bulk",
      { method: "POST", admin: true, body: JSON.stringify({ public_ids: publicIds, status }) },
    ),
};
