import { useState } from "react";
import { useAuth } from "@mkuyu/core";
import { useArchiveBuilding, useBuildings, useCreateBuilding, useSites, useUpdateBuilding } from "@mkuyu/sales";
import type { Building } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Button, Card, ConfirmDialog, ErrorState, Field, FilterBar, Input, Modal, Money, PageHeader, Select, Spinner, Textarea } from "../../components/ui";

interface BuildingForm {
  name: string;
  code: string;
  site_id: string;
  value: string;
  notes: string;
}

const EMPTY: BuildingForm = { name: "", code: "", site_id: "", value: "", notes: "" };

export function BuildingsPage() {
  const { can } = useAuth();
  const { push } = useToast();
  const sites = useSites();
  const [siteFilter, setSiteFilter] = useState("");
  const buildings = useBuildings(siteFilter || undefined, true);
  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const archiveBuilding = useArchiveBuilding();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [form, setForm] = useState<BuildingForm>(EMPTY);
  const [error, setError] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Building | null>(null);
  const busy = createBuilding.isPending || updateBuilding.isPending;

  function startCreate() {
    setEditing(null);
    setForm({ ...EMPTY, site_id: siteFilter });
    setError("");
    setOpen(true);
  }

  function startEdit(building: Building) {
    setEditing(building);
    setForm({
      name: building.name,
      code: building.code,
      site_id: building.site ? String(building.site.id) : "",
      value: building.value.amount === "0.00" ? "" : building.value.amount,
      notes: building.notes || "",
    });
    setError("");
    setOpen(true);
  }

  async function save() {
    setError("");
    if (!form.name.trim() || !form.site_id) {
      setError("Name and site are required.");
      return;
    }
    const body = {
      name: form.name.trim(),
      code: form.code.trim(),
      site_id: Number(form.site_id),
      value: form.value ? Number(form.value) : 0,
      notes: form.notes,
    };
    try {
      if (editing) {
        await updateBuilding.mutateAsync({ id: editing.id, body });
        push("Building updated.", "success");
      } else {
        await createBuilding.mutateAsync(body as never);
        push("Building created.", "success");
      }
      setOpen(false);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function archive() {
    if (!archiveTarget) return;
    try {
      await archiveBuilding.mutateAsync(archiveTarget.id);
      push("Building archived.", "success");
      setArchiveTarget(null);
    } catch (caught) {
      push((caught as Error).message, "error");
    }
  }

  const columns: Column<Building>[] = [
    {
      header: "Building",
      primary: true,
      render: (building) => (
        <>
          <div className="font-medium text-slate-900">{building.name}</div>
          <div className="font-mono text-[11px] text-slate-400">{building.code || "No code"}</div>
        </>
      ),
    },
    { header: "Site", render: (building) => building.site?.name || "—" },
    { header: "Units", align: "right", render: (building) => building.unit_count },
    { header: "Available", align: "right", render: (building) => <span className="font-medium text-emerald-600">{building.available_count}</span> },
    { header: "Reserved", align: "right", render: (building) => building.reserved_count },
    { header: "Value", align: "right", render: (building) => <Money value={building.value} /> },
    ...(can("manage_buildings") ? [{
      header: "",
      align: "right" as const,
      render: (building: Building) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" onClick={(event) => { event.stopPropagation(); startEdit(building); }}>Edit</Button>
          {can("archive_buildings") && <Button variant="ghost" onClick={(event) => { event.stopPropagation(); setArchiveTarget(building); }}>Archive</Button>}
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Buildings"
        description="Blocks and towers inside each site."
        actions={can("manage_buildings") ? <Button onClick={startCreate}>New building</Button> : undefined}
      />

      <FilterBar>
        <Field label="Site">
          <Select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)} className="max-w-sm">
            <option value="">All sites</option>
            {sites.data?.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </Select>
        </Field>
      </FilterBar>

      {buildings.isError && <ErrorState message={buildings.error?.message || "Could not load buildings."} onRetry={() => buildings.refetch()} />}
      {buildings.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={buildings.data ?? []}
            rowKey={(building) => String(building.id)}
            onRowClick={can("manage_buildings") ? startEdit : undefined}
            emptyText="No buildings match this site."
          />
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit building" : "New building"}
        description={editing ? editing.code || editing.name : "A building belongs to one site."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create building"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Building name" required>
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="CDL-MASAKI-1-B01" />
          </Field>
          <Field label="Building code" hint="Carried into unit codes, e.g. …-B01">
            <Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="font-mono" />
          </Field>
          <Field label="Site" required>
            <Select value={form.site_id} onChange={(event) => setForm({ ...form, site_id: event.target.value })}>
              <option value="">Choose a site</option>
              {sites.data?.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </Select>
          </Field>
          <Field label="Building value">
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
        title="Archive this building?"
        description={archiveTarget ? `${archiveTarget.name} will disappear from the active lists.` : ""}
        confirmLabel="Archive building"
        tone="danger"
        busy={archiveBuilding.isPending}
        onConfirm={archive}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}
