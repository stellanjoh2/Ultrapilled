/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UNSPLASH_ACCESS_KEY?: string;
  readonly VITE_GIPHY_API_KEY?: string;
  readonly VITE_BUG_REPORT_API_URL?: string;
  /** Cloudflare Turnstile site key (public). Pair with TURNSTILE_SECRET_KEY on the Orby API. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Isso guestbook origin. Defaults to https://guestbook.ultrapilled.com (localhost:8080 in dev). */
  readonly VITE_GUESTBOOK_API_URL?: string;
  /** Temporary share API. Defaults to https://share.ultrapilled.com (localhost:8081 in dev). */
  readonly VITE_SHARE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
