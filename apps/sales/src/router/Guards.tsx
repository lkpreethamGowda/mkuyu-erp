import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@mkuyu/core";
import type { SalesPermission } from "@mkuyu/api";
import { Card, Spinner } from "../components/ui";

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f5]">
      <Spinner label="Loading your workspace…" />
    </div>
  );
}

export function LandingRedirect() {
  const { status, session } = useAuth();
  if (status === "loading") return <FullScreenLoader />;
  if (status === "no_access") return <Navigate to="/no-access" replace />;
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  return <Navigate to={session?.role === "department_head" ? "/department" : "/dashboard"} replace />;
}

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullScreenLoader />;
  if (status === "no_access") return <Navigate to="/no-access" replace />;
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequirePermission({ permission, children }: { permission: SalesPermission; children: React.ReactNode }) {
  const { can } = useAuth();
  if (!can(permission)) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-base font-semibold text-slate-900">Not available for your role</h1>
        <p className="mt-2 text-sm text-slate-600">Your sales role does not include this screen.</p>
      </Card>
    );
  }
  return <>{children}</>;
}
