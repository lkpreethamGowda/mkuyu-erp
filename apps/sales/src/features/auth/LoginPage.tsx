import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "@mkuyu/api";
import { useAuth } from "@mkuyu/core";
import { Button, Field, Input } from "../../components/ui";

export function LoginPage() {
  const { status, loginStaff } = useAuth();
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (status === "authenticated") return <Navigate to="/dashboard" replace />;
  if (status === "no_access") return <Navigate to="/no-access" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const session = await loginStaff(login.trim(), password);
      const allowed = session.permissions.is_erp ?? session.permissions.is_sales;
      const home = session.role === "department_head" ? "/department" : "/dashboard";
      navigate(allowed ? home : "/no-access", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#edf2ef] px-4 py-10">
      <div className="absolute inset-x-0 top-0 h-1 bg-brand-600" />
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-[0_8px_22px_rgba(25,95,75,0.22)]">
            M
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">MKUYU</h1>
          <p className="mt-1 text-sm font-medium text-slate-700">Operations workspace</p>
          <p className="mt-1 text-xs text-slate-500">Sales · Finance · Collections · Management</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 sm:p-7">
          <div className="space-y-4">
            <Field label="Email or login" htmlFor="login" required>
              <Input
                id="login"
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="you@mkuyu.co.tz"
              />
            </Field>
            <Field label="Password" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </Field>
          </div>

          {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}

          <Button type="submit" className="mt-5 w-full" disabled={busy || !login || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Sales data is read from and written to Odoo. Your role controls what you can do.
        </p>
      </div>
    </div>
  );
}
