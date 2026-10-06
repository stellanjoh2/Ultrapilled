/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UNSPLASH_ACCESS_KEY?: string;
  readonly VITE_GIPHY_API_KEY?: string;
  readonly VITE_BUG_REPORT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
