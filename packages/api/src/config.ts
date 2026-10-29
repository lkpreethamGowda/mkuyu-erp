// Runtime configuration injected by the app (Vite env in apps/sales).
// Nothing here reads import.meta.env, so the package stays bundler-neutral.

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type DataSource = "mock" | "api";

export interface ApiConfig {
  baseUrl: string;
  authSource: DataSource;
  salesSource: DataSource;
  storage: KeyValueStorage;
  /** Active staff company; appended to every sales request by the shared client. */
  activeCompanyId?: number;
}

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

const defaultStorage: KeyValueStorage =
  typeof localStorage !== "undefined" ? localStorage : memoryStorage();

let config: ApiConfig = {
  baseUrl: "",
  authSource: "api",
  salesSource: "api",
  storage: defaultStorage,
};

export function configureApi(next: Partial<ApiConfig>): void {
  config = {
    ...config,
    ...next,
    baseUrl: (next.baseUrl ?? config.baseUrl).replace(/\/$/, ""),
  };
}

export const getApiConfig = (): ApiConfig => config;
