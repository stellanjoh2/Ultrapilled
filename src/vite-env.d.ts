/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UNSPLASH_ACCESS_KEY?: string;
  readonly VITE_GIPHY_API_KEY?: string;
  readonly VITE_BUG_REPORT_API_URL?: string;
  /** Cloudflare Turnstile site key (public). Pair with TURNSTILE_SECRET_KEY on the Orby API. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
