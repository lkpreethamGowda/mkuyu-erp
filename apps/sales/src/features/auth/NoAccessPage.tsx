import { useNavigate } from "react-router-dom";
import { useAuth } from "@mkuyu/core";
import { Button, Card } from "../../components/ui";

export function NoAccessPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#edf2ef] px-4">
      <Card className="w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-lg font-bold text-amber-700">!</div>
        <h1 className="text-lg font-semibold text-slate-900">No ERP access</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {session?.name ? `${session.name}, your` : "Your"} Odoo user does not have a management role
          that uses this workspace. Ask an administrator to add the correct CDL or group role.
        </p>
        <Button onClick={signOut} className="mt-6">Sign out</Button>
      </Card>
    </div>
  );
}
