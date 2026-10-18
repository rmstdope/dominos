/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" builds the app with accounts instead of the WhatsApp ordering app. */
  readonly VITE_ACCOUNTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
