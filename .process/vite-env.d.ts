/// <reference types="vite/client" />

interface ImportMetaEnv {
  // readonly VITE_ELEMENT?: string;
  readonly VITE_ELEMENT_PATH?: string;
  readonly VITE_ELEMENT_TYPE?: string;
  readonly VITE_ELEMENT_NAME?: string;
  readonly VITE_ACTION_SIGNAL_KEY?: string;
  readonly VITE_PROPERTY_KEY?: string;
  readonly VITE_PROPERTY_TYPE?: string;
  readonly VITE_PROPERTY_UI_PATH?: string;
  readonly VITE_MODULE_PATH?: string;
  readonly VITE_UI_DIRECTORY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 