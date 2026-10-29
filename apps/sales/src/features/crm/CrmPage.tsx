import { useEffect, useState } from "react";
import { formatDate, useAuth } from "@mkuyu/core";
import {
  useCreateCrmActivity,
  useCreateCrmLead,
  useCrmActivities,
  useCrmLeads,
  useCrmMeta,
  useMoveCrmLead,
  useUpdateCrmLead,
} from "@mkuyu/sales";
import type { CrmLead } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  Modal,
  Money,
  PageHeader,
  SearchInput,
  Select,
  Spinner,
  Textarea,
} from "../../components/ui";

interface LeadForm {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  expected_revenue: string;
  probability: string;
  date_deadline: string;
  stage_id: string;
  description: string;
}

const EMPTY: LeadForm = {
  name: "", contact_name: "", email: "", phone: "", expected_revenue: "",
  probability: "20", date_deadline: "", stage_id: "", description: "",
};

export function CrmPage() {
  const { can } = useAuth();
  const { push } = useToast();
  const meta = useCrmMeta();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const leads = useCrmLeads({ search: applied || undefined, limit: 200 });
  const createLead = useCreateCrmLead();
  const updateLead = useUpdateCrmLead();
  const moveStage = useMoveCrmLead();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrmLead | null>(null);
  const [form, setForm] = useState<LeadForm>(EMPTY);
  const [activitySummary, setActivitySummary] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const activities = useCrmActivities(editing?.id);
  const createActivity = useCreateCrmActivity();
  const busy = createLead.isPending || updateLead.isPending;

  useEffect(() => {
    if (!open) return;
    const firstStage = meta.data?.stages[0];
    if (!editing) setForm({ ...EMPTY, stage_id: firstStage ? String(firstStage.id) : "" });
  }, [open, editing, meta.data]);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }

  function startEdit(lead: CrmLead) {
    setEditing(lead);
    setForm({
      name: lead.name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      expected_revenue: lead.expected_revenue.amount,
      probability: String(lead.probability || 0),
      date_deadline: lead.date_deadline || "",
      stage_id: String(lead.stage_id || ""),
      description: lead.description || "",
    });
    setActivitySummary("");
    setActivityDate("");
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      push("Opportunity name is required.", "error");
      return;
    }
    const body = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim(),
      email_from: form.email.trim(),
      phone: form.phone.trim(),
      expected_revenue: form.expected_revenue ? Number(form.expected_revenue) : 0,
      probability: form.probability ? Number(form.probability) : 0,
      date_deadline: form.date_deadline || false,
      stage_id: form.stage_id ? Number(form.stage_id) : false,
      description: form.description,
    };
    try {
      if (editing) {
        await updateLead.mutateAsync({ id: editing.id, body });
        push("Opportunity updated.", "success");
      } else {
        await createLead.mutateAsync(body);
        push("Opportunity created.", "success");
      }
      setOpen(false);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function changeStage(lead: CrmLead, stageId: string) {
    if (!stageId || Number(stageId) === lead.stage_id) return;
    try {
      await moveStage.mutateAsync({ id: lead.id, stageId: Number(stageId) });
      push("Stage updated.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function addActivity() {
    if (!editing || !activitySummary.trim() || !activityDate) {
      push("Write an activity and choose a date.", "error");
      return;
    }
    try {
      await createActivity.mutateAsync({
        leadId: editing.id,
        body: { summary: activitySummary.trim(), date_deadline: activityDate },
      });
      push("Activity scheduled.", "success");
      setActivitySummary("");
      setActivityDate("");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  if (meta.isLoading || leads.isLoading) return <Spinner label="Loading CRM…" />;
  if (meta.isError || leads.isError) {
    return <ErrorState message={meta.error?.message || leads.error?.message || "Could not load CRM."} onRetry={() => { meta.refetch(); leads.refetch(); }} />;
  }

  const stages = meta.data?.stages ?? [];
  const rows = leads.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="CRM"
        description="Opportunities by stage. Move a card’s stage or open it to edit and schedule an activity."
        actions={can("manage_crm") ? <Button onClick={startCreate}>New opportunity</Button> : undefined}
      />

      <Card className="mb-5 p-4">
        <Field label="Search">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Opportunity, contact, phone or email"
            className="max-w-md"
          />
        </Field>
        <div className="mt-2">
          <Button variant="secondary" onClick={() => setApplied(search.trim())}>Search</Button>
        </div>
      </Card>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = rows.filter((lead) => lead.stage_id === stage.id);
          return (
            <div key={stage.id} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{stage.name}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{stageLeads.length}</span>
              </div>
              <div className="space-y-2">
                {stageLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => startEdit(lead)}
                    className="w-full rounded-xl bg-white p-3.5 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300"
                  >
                    <p className="text-sm font-semibold text-slate-900">{lead.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{lead.contact_name || lead.partner?.name || "No contact"}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700"><Money value={lead.expected_revenue} /></span>
                      <span className="text-slate-400">{lead.date_deadline ? formatDate(lead.date_deadline) : ""}</span>
                    </div>
                    {can("manage_crm") && (
                      <select
                        value={lead.stage_id}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => changeStage(lead, event.target.value)}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600"
                        aria-label="Change stage"
                      >
                        {stages.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                      </select>
                    )}
                  </button>
                ))}
                {stageLeads.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400">No opportunities</div>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit opportunity" : "New opportunity"}
        description={editing ? editing.name : "Add a lead to the pipeline"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Close</Button>
            {can("manage_crm") && <Button onClick={save} disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create"}</Button>}
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Opportunity" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field></div>
          <Field label="Contact name"><Input value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Expected revenue"><Input type="number" min={0} step="0.01" value={form.expected_revenue} onChange={(event) => setForm({ ...form, expected_revenue: event.target.value })} /></Field>
          <Field label="Probability (%)"><Input type="number" min={0} max={100} value={form.probability} onChange={(event) => setForm({ ...form, probability: event.target.value })} /></Field>
          <Field label="Deadline"><Input type="date" value={form.date_deadline} onChange={(event) => setForm({ ...form, date_deadline: event.target.value })} /></Field>
          <Field label="Stage">
            <Select value={form.stage_id} onChange={(event) => setForm({ ...form, stage_id: event.target.value })}>
              {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
        </div>

        {editing && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Activities</p>
            <div className="mt-2 space-y-2">
              {(activities.data ?? []).map((activity) => (
                <div key={activity.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="font-medium">{activity.summary}</span><span className="text-xs text-slate-400">{formatDate(activity.date_deadline)}</span></div>
                  <p className="text-xs text-slate-500">{activity.user?.name || ""}</p>
                </div>
              ))}
              {(activities.data ?? []).length === 0 && <p className="text-sm text-slate-400">No activity scheduled.</p>}
            </div>
            {can("manage_crm") && (
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Input value={activitySummary} onChange={(event) => setActivitySummary(event.target.value)} placeholder="Call, meeting, follow-up…" />
                <Input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} />
                <Button variant="secondary" onClick={addActivity} disabled={createActivity.isPending}>Add</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
