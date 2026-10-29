import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError, authApi, configureApi, salesApi, tokenStore } from "@mkuyu/api";
import type { Company, ErpRole, SalesMe, SalesPermission, SalesPermissions } from "@mkuyu/api";

export type AuthStatus = "loading" | "authenticated" | "no_access" | "anonymous";

export interface ErpSession {
  user: { id: number; name: string; email: string };
  name: string;
  role: ErpRole | null;
  companies: Company[];
  activeCompanyId?: number;
  permissions: SalesPermissions;
}

interface AuthContextValue {
  status: AuthStatus;
  session: ErpSession | null;
  loginStaff: (login: string, password: string) => Promise<ErpSession>;
  logout: () => Promise<void>;
  setActiveCompany: (companyId: number) => void;
  can: (permission: SalesPermission) => boolean;
}

export const NO_PERMISSIONS: SalesPermissions = {
  is_sales: false,
  is_erp: false,
  erp_role: null,
  sales_role: null,
  view_dashboard: false,
  view_units: false,
  manage_units: false,
  archive_units: false,
  reserve_units: false,
  handover_units: false,
  manage_sites: false,
  archive_sites: false,
  manage_buildings: false,
  archive_buildings: false,
  setup_master_data: false,
  view_buyers: false,
  manage_buyers: false,
  archive_buyers: false,
  view_orders: false,
  view_crm: false,
  manage_crm: false,
  view_catalog: false,
  manage_catalog_products: false,
  manage_catalog_plans: false,
  create_orders: false,
  edit_orders: false,
  delete_orders: false,
  confirm_orders: false,
  approve_discounts: false,
  approve_finance: false,
  view_approvals: false,
  view_invoices: false,
  create_invoices: false,
  post_invoices: false,
  register_payments: false,
  view_payments: false,
  create_installments: false,
  create_credit_notes: false,
  approve_credit_notes: false,
  post_credit_notes: false,
  view_payment_proofs: false,
  review_payment_proofs: false,
  view_client_requests: false,
  review_client_requests: false,
  view_followups: false,
  write_followups: false,
  view_collections: false,
  view_finance_dashboard: false,
  view_department: false,
  approve_department: false,
  view_finance: false,
  manage_finance: false,
  post_bills: false,
  manage_journal: false,
  close_period: false,
  view_finance_reports: false,
  view_cash: false,
  manage_cash: false,
  view_reports: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromSales(me: SalesMe): ErpSession {
  const companies = me.companies ?? [];
  // Older API deployments only sent sales_role; keep those sessions usable.
  const role = me.erp_role
    ?? (me.sales_role ? (`sales_${me.sales_role}` as ErpRole) : null);
  return {
    user: me.user,
    name: me.user.name,
    role,
    companies,
    activeCompanyId: companies[0]?.id,
    permissions: me.permissions,
  };
}

function noAccessSession(me: { id: number; name: string; companies: Company[] }): ErpSession {
  const companies = me.companies ?? [];
  return {
    user: { id: me.id, name: me.name, email: "" },
    name: me.name,
    role: null,
    companies,
    activeCompanyId: companies[0]?.id,
    permissions: NO_PERMISSIONS,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<ErpSession | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!tokenStore.getAccess() && !tokenStore.getRefresh()) {
        setStatus("anonymous");
        return;
      }
      try {
        const me = await salesApi.me();
        if (cancelled) return;
        const next = sessionFromSales(me);
        configureApi({ activeCompanyId: next.activeCompanyId });
        setSession(next);
        setStatus("authenticated");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.isForbidden) {
          try {
            const me = await authApi.me();
            if (cancelled) return;
            const next = noAccessSession(me);
            configureApi({ activeCompanyId: next.activeCompanyId });
            setSession(next);
            setStatus("no_access");
            return;
          } catch {
            /* fall through to signed out */
          }
        }
        tokenStore.clear();
        setSession(null);
        setStatus("anonymous");
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginStaff = useCallback(async (login: string, password: string) => {
    const data = await authApi.staffLogin(login, password);
    tokenStore.set({ access: data.access_token, refresh: data.refresh_token, scope: "staff" });
    const companies = data.user.companies ?? [];
    configureApi({ activeCompanyId: companies[0]?.id });
    try {
      const me = await salesApi.me();
      const next = sessionFromSales(me);
      configureApi({ activeCompanyId: next.activeCompanyId });
      setSession(next);
      setStatus("authenticated");
      return next;
    } catch (error) {
      if (error instanceof ApiError && error.isForbidden) {
        const next = noAccessSession({ id: data.user.id, name: data.user.name, companies });
        setSession(next);
        setStatus("no_access");
        return next;
      }
      tokenStore.clear();
      setSession(null);
      setStatus("anonymous");
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // local sign-out must still work when the API is unreachable
    }
    tokenStore.clear();
    configureApi({ activeCompanyId: undefined });
    setSession(null);
    setStatus("anonymous");
  }, []);

  const setActiveCompany = useCallback((companyId: number) => {
    configureApi({ activeCompanyId: companyId });
    setSession((current) => (current ? { ...current, activeCompanyId: companyId } : current));
  }, []);

  const can = useCallback(
    (permission: SalesPermission) => Boolean(session?.permissions?.[permission]),
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, loginStaff, logout, setActiveCompany, can }),
    [status, session, loginStaff, logout, setActiveCompany, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
