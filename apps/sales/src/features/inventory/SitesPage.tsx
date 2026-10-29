import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@mkuyu/core";
import { useArchiveSite, useCreateSite, useSites, useUpdateSite } from "@mkuyu/sales";
import type { Site } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Button, Card, ConfirmDialog, ErrorState, Field, Input, Modal, Money, PageHeader, Spinner, Textarea } from "../../components/ui";

interface SiteForm {
  name: string;
  site_code: string;
  value: string;
  notes: string;
}

const EMPTY: SiteForm = { name: "", site_code: "", value: "", notes: "" };

export function SitesPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { push } = useToast();
  const sites = useSites();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const archiveSite = useArchiveSite();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [form, setForm] = useState<SiteForm>(EMPTY);
  const [error, setError] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Site | null>(null);

  const busy = createSite.isPending || updateSite.isPending;

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setOpen(true);
  }

  function startEdit(site: Site) {
    setEditing(site);
    setForm({
      name: site.name,
      site_code: site.code,
      value: site.value.amount === "0.00" ? "" : site.value.amount,
      notes: site.notes || "",
    });
    setError("");
    setOpen(true);
  }

  async function save() {
    setError("");
    if (!form.name.trim() || !form.site_code.trim()) {
      setError("Name and Site Code are required.");
      return;
    }
    const body = {
      name: form.name.trim(),
      site_code: form.site_code.trim(),
      value: form.value ? Number(form.value) : 0,
      notes: form.notes,
    };
    try {
      if (editing) {
        await updateSite.mutateAsync({ id: editing.id, body });
        push("Site updated.", "success");
      } else {
        await createSite.mutateAsync(body as never);
        push("Site created.", "success");
      }
      setOpen(false);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function archive() {
    if (!archiveTarget) return;
    try {
      await archiveSite.mutateAsync(archiveTarget.id);
      push("Site archived.", "success");
      setArchiveTarget(null);
    } catch (caught) {
      push((caught as Error).message, "error");
    }
  }

  const columns: Column<Site>[] = [
    {
      header: "Site",
      primary: true,
      render: (site) => (
        <>
          <div className="font-medium text-slate-900">{site.name}</div>
          <div className="font-mono text-[11px] text-slate-400">{site.code}</div>
        </>
      ),
    },
    { header: "Buildings", align: "right", render: (site) => site.building_count },
    { header: "Units", align: "right", render: (site) => site.unit_count },
    { header: "Available", align: "right", render: (site) => <span className="font-medium text-emerald-600">{site.available_count}</span> },
    { header: "Reserved", align: "right", render: (site) => site.reserved_count },
    { header: "Value", align: "right", render: (site) => <Money value={site.value} /> },
    ...(can("manage_sites") ? [{
      header: "",
      align: "right" as const,
      render: (site: Site) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" onClick={(event) => { event.stopPropagation(); startEdit(site); }}>Edit</Button>
          {can("archive_sites") && <Button variant="ghost" onClick={(event) => { event.stopPropagation(); setArchiveTarget(site); }}>Archive</Button>}
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Sites"
        description="The land and developments that hold the company's units."
        actions={can("manage_sites") ? <Button onClick={startCreate}>New site</Button> : undefined}
      />

      {sites.isError && <ErrorState message={sites.error?.message || "Could not load sites."} onRetry={() => sites.refetch()} />}
      {sites.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={sites.data ?? []}
            rowKey={(site) => String(site.id)}
            onRowClick={can("manage_sites") ? startEdit : undefined}
            emptyText="No sites yet."
          />
        </Card>
      )}

      <Card className="mt-5 p-4">
        <p className="text-xs text-slate-500">
          Need a unit list for one site? <button className="font-medium text-brand-700 hover:underline" onClick={() => navigate("/inventory/units")}>Open Units</button> and filter by site.
        </p>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit site" : "New site"}
        description={editing ? editing.code : "A site groups buildings and units."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create site"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Site name" required>
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="CDL-MASAKI-1" />
          </Field>
          <Field label="Site code" required hint="Unique per company, e.g. CDL-L02-MASAKI-1">
            <Input value={form.site_code} onChange={(event) => setForm({ ...form, site_code: event.target.value })} className="font-mono" />
          </Field>
          <Field label="Site value">
            <Input type="number" min={0} step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive this site?"
        description={archiveTarget ? `${archiveTarget.name} will disappear from the active lists.` : ""}
        confirmLabel="Archive site"
        tone="danger"
        busy={archiveSite.isPending}
        onConfirm={archive}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}
