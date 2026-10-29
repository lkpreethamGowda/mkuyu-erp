// ERP tokens live under their own keys so the Collection Portal and this app
// can safely share a browser origin during the local POC.

import { getApiConfig } from "./config";

const store = () => getApiConfig().storage;

const ACCESS_KEY = "mkuyu.erp.access_token";
const REFRESH_KEY = "mkuyu.erp.refresh_token";
const SCOPE_KEY = "mkuyu.erp.scope";

export const tokenStore = {
  getAccess(): string | null {
    return store().getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    return store().getItem(REFRESH_KEY);
  },
  getScope(): string | null {
    return store().getItem(SCOPE_KEY);
  },
  set(tokens: { access: string; refresh: string; scope: string }): void {
    store().setItem(ACCESS_KEY, tokens.access);
    store().setItem(REFRESH_KEY, tokens.refresh);
    store().setItem(SCOPE_KEY, tokens.scope);
  },
  setAccess(access: string): void {
    store().setItem(ACCESS_KEY, access);
  },
  setRefresh(refresh: string): void {
    store().setItem(REFRESH_KEY, refresh);
  },
  clear(): void {
    store().removeItem(ACCESS_KEY);
    store().removeItem(REFRESH_KEY);
    store().removeItem(SCOPE_KEY);
  },
};
