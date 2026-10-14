export type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      theme?: string;
      action?: string;
      callback?: () => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string | number;
  remove: (id: string | number) => void;
  reset: (id: string | number) => void;
  getResponse: (id: string | number) => string;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

export function turnstileSiteKey(): string {
  return import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export function ensureTurnstileScript(): Promise<void> {
  if (typeof window.turnstile !== "undefined") return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile script"));
    };
    document.head.append(script);
  });
  return scriptPromise;
}
