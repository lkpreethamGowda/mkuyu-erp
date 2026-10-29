import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { documentName, formatDate, isoDate, useAuth } from "@mkuyu/core";
import { useCreateFinanceBill, useFinanceBillMeta, useFinanceBills } from "@mkuyu/sales";
import type { InvoiceSummary } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Button,
  Card,
  ErrorState,
  Field,
  FilterBar,
  Input,
  Modal,
  Money,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StatusBadge,
} from "../../components/ui";

interface BillLineForm {
  name: string;
  quantity: string;
  price_unit: string;
  account_id: string;
  tax_ids: number[];
}

const EMPTY_LINE: BillLineForm = { name: "", quantity: "1", price_unit: "", account_id: "", tax_ids: [] };

export function BillsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { push } = useToast();
  const meta = useFinanceBillMeta(can("manage_finance"));
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const bills = useFinanceBills({ search: applied || undefined, state: state || undefined, page, limit: 25 });
  const createBill = useCreateFinanceBill();
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(isoDate());
  const [dueDate, setDueDate] = useState("");
  const [reference, setReference] = useState("");
  const [journalId, setJournalId] = useState("");
  const [lines, setLines] = useState<BillLineForm[]>([{ ...EMPTY_LINE }]);

  useEffect(() => {
    if (!open || !meta.data) return;
    setPartnerId((current) => current || String(meta.data?.partners[0]?.id || ""));
    setJournalId((current) => current || String(meta.data?.journals[0]?.id || ""));
    setLines((current) => current.map((line) => line.account_id ? line : { ...line, account_id: String(meta.data?.accounts[0]?.id || "") }));
  }, [open, meta.data]);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.price_unit) || 0), 0),
    [lines],
  );

  function updateLine(index: number, patch: Partial<BillLineForm>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  async function save() {
    if (!partnerId) {
      push("Choose a supplier.", "error");
      return;
    }
    const payloadLines = lines
      .filter((line) => line.name.trim())
      .map((line) => ({
        name: line.name.trim(),
        quantity: Number(line.quantity) || 1,
        price_unit: Number(line.price_unit) || 0,
        account_id: Number(line.account_id),
        tax_ids: line.tax_ids,
      }));
    if (!payloadLines.length) {
      push("Add at least one bill line.", "error");
      return;
    }
    if (payloadLines.some((line) => !line.account_id)) {
      push("Choose an expense account on every line.", "error");
      return;
    }
    try {
      const bill = await createBill.mutateAsync({
        partner_id: Number(partnerId),
        invoice_date: invoiceDate,
        due_date: dueDate || invoiceDate,
        reference: reference.trim(),
        journal_id: journalId ? Number(journalId) : undefined,
        lines: payloadLines,
      });
      push(`Vendor bill ${bill.name || "draft"} created.`, "success");
      setOpen(false);
      setPartnerId("");
      setReference("");
      setDueDate("");
      setLines([{ ...EMPTY_LINE }]);
      navigate(`/finance/bills/${bill.id}`);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<InvoiceSummary>[] = [
    {
      header: "Bill",
      primary: true,
      render: (bill) => (
        <>
          <div className="font-medium text-slate-900">{bill.partner?.name || "—"}</div>
          <div className="font-mono text-[11px] text-slate-400">{documentName(bill)}</div>
        </>
      ),
    },
    { header: "Date", render: (bill) => formatDate(bill.invoice_date) },
    { header: "Due", render: (bill) => formatDate(bill.due_date) },
    { header: "Total", align: "right", render: (bill) => <Money value={bill.amount_total} /> },
    { header: "Balance", align: "right", render: (bill) => <Money value={bill.amount_residual} /> },
    { header: "State", render: (bill) => <StatusBadge status={bill.state.code} label={bill.state.label} /> },
    { header: "Payment", render: (bill) => <StatusBadge status={bill.payment_state.code} label={bill.payment_state.label} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Vendor bills"
        description="Accounts payable: create, post, pay and track supplier bills without opening Odoo."
        actions={can("manage_finance") ? <Button onClick={() => setOpen(true)}>New bill</Button> : undefined}
      />
      <FilterBar>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }}
        >
          <div className="flex-1 sm:max-w-md">
            <Field label="Search"><SearchInput value={search} onChange={setSearch} placeholder="Bill number, supplier or reference" /></Field>
          </div>
          <Field label="View">
            <Select value={state} onChange={(event) => { setState(event.target.value); setPage(1); }}>
              <option value="">All bills</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="cancel">Cancelled</option>
            </Select>
          </Field>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </FilterBar>

      {bills.isError && <ErrorState message={bills.error?.message || "Could not load vendor bills."} onRetry={() => bills.refetch()} />}
      {bills.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={bills.data?.data ?? []}
            rowKey={(bill) => String(bill.id)}
            onRowClick={(bill) => navigate(`/finance/bills/${bill.id}`)}
            emptyText="No vendor bill matches this view."
          />
          <Pagination meta={bills.data?.meta} onPage={setPage} />
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New vendor bill"
        description="The bill is saved as a draft. Post it when it is ready to enter the ledger."
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={createBill.isPending}>Cancel</Button>
            <Button onClick={save} disabled={createBill.isPending}>{createBill.isPending ? "Saving…" : "Save draft"}</Button>
          </>
        }
      >
        {meta.isLoading ? <Spinner /> : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Supplier" required>
                <Select value={partnerId} onChange={(event) => setPartnerId(event.target.value)}>
                  <option value="">Choose a supplier</option>
                  {(meta.data?.partners ?? []).map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                </Select>
              </Field>
              <Field label="Purchase journal">
                <Select value={journalId} onChange={(event) => setJournalId(event.target.value)}>
                  {(meta.data?.journals ?? []).map((journal) => <option key={journal.id} value={journal.id}>{journal.name}</option>)}
                </Select>
              </Field>
              <Field label="Bill date"><Input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></Field>
              <Field label="Due date"><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="Supplier reference"><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Invoice number from the supplier" /></Field></div>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lines</p>
                <Button variant="ghost" onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}>Add line</Button>
              </div>
              <div className="space-y-3 p-3">
                {lines.map((line, index) => (
                  <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-12">
                    <div className="sm:col-span-5"><Field label="Description"><Input value={line.name} onChange={(event) => updateLine(index, { name: event.target.value })} /></Field></div>
                    <div className="sm:col-span-2"><Field label="Qty"><Input type="number" min={0} step="0.01" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} /></Field></div>
                    <div className="sm:col-span-2"><Field label="Unit price"><Input type="number" min={0} step="0.01" value={line.price_unit} onChange={(event) => updateLine(index, { price_unit: event.target.value })} /></Field></div>
                    <div className="sm:col-span-3"><Field label="Expense account">
                      <Select value={line.account_id} onChange={(event) => updateLine(index, { account_id: event.target.value })}>
                        <option value="">Choose account</option>
                        {(meta.data?.accounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
                      </Select>
                    </Field></div>
                    <div className="flex items-end justify-end sm:col-span-12">
                      {lines.length > 1 && <Button variant="ghost" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove</Button>}
                    </div>
                    {(meta.data?.taxes ?? []).length > 0 && (
                      <div className="sm:col-span-12">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Purchase taxes</p>
                        <div className="flex flex-wrap gap-3">
                          {(meta.data?.taxes ?? []).map((tax) => (
                            <label key={tax.id} className="flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                checked={line.tax_ids.includes(tax.id)}
                                onChange={(event) => updateLine(index, {
                                  tax_ids: event.target.checked ? [...line.tax_ids, tax.id] : line.tax_ids.filter((id) => id !== tax.id),
                                })}
                              />
                              {tax.name} ({tax.amount}%)
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end text-sm">
              <span className="text-slate-500">Subtotal before tax</span>
              <span className="ml-4 font-semibold tabular-nums">{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {meta.data?.currency}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
