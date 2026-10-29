import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBuyer, useCreateBuyer, useUpdateBuyer } from "@mkuyu/sales";
import { useToast } from "../../components/Toast";
import { BackButton, Button, Card, CardHeader, Field, Input, PageHeader, Spinner, Textarea } from "../../components/ui";

interface FormState {
  name: string;
  phone: string;
  email: string;
  national_id: string;
  customer_id: string;
  street: string;
  city: string;
  vat: string;
  website: string;
  notes: string;
}

const EMPTY: FormState = { name: "", phone: "", email: "", national_id: "", customer_id: "", street: "", city: "", vat: "", website: "", notes: "" };

export function BuyerFormPage() {
  const { buyerId } = useParams();
  const editing = Boolean(buyerId);
  const navigate = useNavigate();
  const { push } = useToast();
  const buyer = useBuyer(buyerId);
  const createBuyer = useCreateBuyer();
  const updateBuyer = useUpdateBuyer();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const busy = createBuyer.isPending || updateBuyer.isPending;

  useEffect(() => {
    if (!buyer.data) return;
    const data = buyer.data;
    setForm({
      name: data.name,
      phone: data.phone,
      email: data.email,
      national_id: data.national_id,
      customer_id: data.customer_id,
      street: data.street || "",
      city: data.city,
      vat: data.vat || "",
      website: data.website || "",
      notes: data.notes || "",
    });
  }, [buyer.data]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      national_id: form.national_id.trim(),
      customer_id: form.customer_id.trim(),
      street: form.street.trim(),
      city: form.city.trim(),
      vat: form.vat.trim(),
      website: form.website.trim(),
      comment: form.notes,
    };
    try {
      if (editing && buyerId) {
        await updateBuyer.mutateAsync({ id: Number(buyerId), body });
        push("Buyer updated.", "success");
        navigate(`/buyers/${buyerId}`);
      } else {
        const created = await createBuyer.mutateAsync(body as never);
        push("Buyer created.", "success");
        navigate(`/buyers/${created.id}`);
      }
    } catch (caught) {
      const message = (caught as Error).message;
      setError(message);
      push(message, "error");
    }
  }

  if (editing && buyer.isLoading) return <Spinner label="Loading buyer…" />;

  return (
    <div>
      <PageHeader
        title={editing ? "Edit buyer" : "New buyer"}
        description="Odoo checks national ID and customer ID for duplicates."
        actions={<BackButton label="Back" />}
      />
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Contact details" subtitle="Used on quotations and invoices" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Full name" required>
                <Input value={form.name} onChange={(event) => set("name", event.target.value)} required />
              </Field>
            </div>
            <Field label="Phone">
              <Input value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="+255…" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
            </Field>
            <Field label="National ID" hint="Unique across contacts">
              <Input value={form.national_id} onChange={(event) => set("national_id", event.target.value)} />
            </Field>
            <Field label="Customer ID" hint="The client code printed on statements">
              <Input value={form.customer_id} onChange={(event) => set("customer_id", event.target.value)} />
            </Field>
            <Field label="Street">
              <Input value={form.street} onChange={(event) => set("street", event.target.value)} />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(event) => set("city", event.target.value)} />
            </Field>
            <Field label="VAT">
              <Input value={form.vat} onChange={(event) => set("vat", event.target.value)} />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={(event) => set("website", event.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <Textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900">Save</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">The contact is shared across the companies you can access.</p>
          {error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <Button type="submit" className="mt-4 w-full" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create buyer"}</Button>
          <Button type="button" variant="secondary" className="mt-2 w-full" onClick={() => navigate(-1)}>Cancel</Button>
        </Card>
      </form>
    </div>
  );
}
