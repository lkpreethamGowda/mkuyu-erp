import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBuildings, useCreateUnit, useSites, useUnit, useUpdateUnit } from "@mkuyu/sales";
import { useToast } from "../../components/Toast";
import { BackButton, Button, Card, CardHeader, Field, Input, PageHeader, Select, Spinner, Textarea } from "../../components/ui";

interface FormState {
  name: string;
  unit_code: string;
  site_id: string;
  building_id: string;
  unit_type: string;
  floor: string;
  size_sqm: string;
  rate_per_sqm: string;
  fixed_price: string;
  reservation_deposit: string;
  notes: string;
}

const EMPTY: FormState = {
  name: "", unit_code: "", site_id: "", building_id: "", unit_type: "apartment",
  floor: "", size_sqm: "", rate_per_sqm: "", fixed_price: "", reservation_deposit: "", notes: "",
};

const TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "shop", label: "Shop" },
  { value: "office", label: "Office" },
  { value: "plot", label: "Plot" },
];

export function UnitFormPage() {
  const { unitId } = useParams();
  const editing = Boolean(unitId);
  const navigate = useNavigate();
  const { push } = useToast();
  const unit = useUnit(unitId);
  const sites = useSites();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const buildings = useBuildings(form.site_id || undefined, Boolean(form.site_id));
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const busy = createUnit.isPending || updateUnit.isPending;

  useEffect(() => {
    if (!unit.data) return;
    const data = unit.data;
    setForm({
      name: data.name,
      unit_code: data.unit_code,
      site_id: data.site ? String(data.site.id) : "",
      building_id: data.building ? String(data.building.id) : "",
      unit_type: data.unit_type.code,
      floor: data.floor ? String(data.floor) : "",
      size_sqm: data.size_sqm ? String(data.size_sqm) : "",
      rate_per_sqm: data.rate_per_sqm ? data.rate_per_sqm.amount : "",
      fixed_price: data.fixed_price ? data.fixed_price.amount : "",
      reservation_deposit: data.reservation_deposit.amount === "0.00" ? "" : data.reservation_deposit.amount,
      notes: data.notes || "",
    });
  }, [unit.data]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.unit_code.trim()) {
      setError("Name and Unit Code are required.");
      return;
    }
    const body = {
      name: form.name.trim(),
      unit_code: form.unit_code.trim(),
      site_id: form.site_id ? Number(form.site_id) : false,
      building_id: form.building_id ? Number(form.building_id) : false,
      unit_type: form.unit_type,
      floor: form.floor ? Number(form.floor) : 0,
      size_sqm: form.size_sqm ? Number(form.size_sqm) : 0,
      rate_per_sqm: form.rate_per_sqm ? Number(form.rate_per_sqm) : 0,
      fixed_price: form.fixed_price ? Number(form.fixed_price) : 0,
      reservation_deposit: form.reservation_deposit ? Number(form.reservation_deposit) : 0,
      notes: form.notes,
    };
    try {
      if (editing && unitId) {
        const updated = await updateUnit.mutateAsync({ id: Number(unitId), body });
        push("Unit updated.", "success");
        navigate(`/inventory/units/${updated.id}`);
      } else {
        const created = await createUnit.mutateAsync(body as never);
        push("Unit created.", "success");
        navigate(`/inventory/units/${created.id}`);
      }
    } catch (caught) {
      const message = (caught as Error).message;
      setError(message);
      push(message, "error");
    }
  }

  if (editing && unit.isLoading) return <Spinner label="Loading unit…" />;

  return (
    <div>
      <PageHeader
        title={editing ? "Edit unit" : "New unit"}
        description={editing ? "Change the master data or pricing of this unit." : "Add a sellable unit to a site and building."}
        actions={<BackButton label="Back" />}
      />

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Unit details" subtitle="Required fields are marked with an asterisk" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Unit name" required>
              <Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="MASAKI-1-APARTMENT-201" required />
            </Field>
            <Field label="Unit code" required hint="Unique per company, e.g. CDL-L02-MASAKI-1-B01-U0201">
              <Input value={form.unit_code} onChange={(event) => set("unit_code", event.target.value)} className="font-mono" required />
            </Field>
            <Field label="Site">
              <Select value={form.site_id} onChange={(event) => { set("site_id", event.target.value); set("building_id", ""); }}>
                <option value="">No site</option>
                {sites.data?.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </Select>
            </Field>
            <Field label="Building">
              <Select value={form.building_id} disabled={!form.site_id} onChange={(event) => set("building_id", event.target.value)}>
                <option value="">No building</option>
                {buildings.data?.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
              </Select>
            </Field>
            <Field label="Unit type" required>
              <Select value={form.unit_type} onChange={(event) => set("unit_type", event.target.value)}>
                {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </Select>
            </Field>
            <Field label="Floor">
              <Input type="number" min={0} value={form.floor} onChange={(event) => set("floor", event.target.value)} />
            </Field>
            <Field label="Size (sqm)">
              <Input type="number" min={0} step="0.01" value={form.size_sqm} onChange={(event) => set("size_sqm", event.target.value)} />
            </Field>
            <Field label="Rate per sqm">
              <Input type="number" min={0} step="0.01" value={form.rate_per_sqm} onChange={(event) => set("rate_per_sqm", event.target.value)} />
            </Field>
            <Field label="Fixed price" hint="Leave empty to price by size × rate">
              <Input type="number" min={0} step="0.01" value={form.fixed_price} onChange={(event) => set("fixed_price", event.target.value)} />
            </Field>
            <Field label="Reservation deposit" hint="Required before the unit can be reserved">
              <Input type="number" min={0} step="0.01" value={form.reservation_deposit} onChange={(event) => set("reservation_deposit", event.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <Textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} placeholder="Internal notes about this unit…" />
              </Field>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-900">Save</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Odoo validates the unit code, site and building. The unit starts as Available.
            </p>
            {error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <Button type="submit" className="mt-4 w-full" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create unit"}</Button>
            <Button type="button" variant="secondary" className="mt-2 w-full" onClick={() => navigate(-1)}>Cancel</Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
