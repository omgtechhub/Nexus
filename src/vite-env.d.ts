/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_NAME?: string;
  /** ISO code every price in the app is denominated in; see utils/money.ts. */
  readonly VITE_DEFAULT_CURRENCY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string;
  readonly VITE_FLUTTERWAVE_PUBLIC_KEY?: string;
  readonly VITE_WHATSAPP_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
