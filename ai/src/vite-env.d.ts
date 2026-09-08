/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TENDER_AI?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_MAIN_APP_URL?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
