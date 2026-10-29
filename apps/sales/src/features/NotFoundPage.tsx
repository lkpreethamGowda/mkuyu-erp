import { Link } from "react-router-dom";
import { ButtonLink, Card } from "../components/ui";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">404</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">The screen you followed does not exist.</p>
        <ButtonLink to="/dashboard" className="mt-5">Back to dashboard</ButtonLink>
        <p className="mt-4 text-xs text-slate-400"><Link to="/login" className="hover:underline">Sign in</Link></p>
      </Card>
    </div>
  );
}
