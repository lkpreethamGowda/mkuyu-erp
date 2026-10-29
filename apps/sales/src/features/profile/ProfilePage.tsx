import { useNavigate } from "react-router-dom";
import { useAuth } from "@mkuyu/core";
import { Button, Card, CardHeader, DetailList, DetailRow, PageHeader } from "../../components/ui";
import { roleLabel } from "../../lib/roles";

export function ProfilePage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div>
      <PageHeader title="Profile" description="Your Odoo user and the company you are working in." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" subtitle="Managed in Odoo" />
          <DetailList>
            <DetailRow label="Name" value={session?.name} />
            <DetailRow label="Email" value={session?.user.email || "—"} />
            <DetailRow label="ERP role" value={roleLabel(session?.role)} />
          </DetailList>
        </Card>
        <Card>
          <CardHeader title="Companies" subtitle="Switch company from the sidebar" />
          <DetailList>
            {session?.companies.map((company) => (
              <DetailRow key={company.id} label={company.name} value={company.id === session.activeCompanyId ? "Active" : "Available"} />
            ))}
          </DetailList>
        </Card>
      </div>
      <Card className="mt-5 p-5">
        <p className="text-sm text-slate-600">Signing out only ends this browser session.</p>
        <Button variant="secondary" className="mt-3" onClick={signOut}>Sign out</Button>
      </Card>
    </div>
  );
}
