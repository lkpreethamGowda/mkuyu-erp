import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDate, isoDate, useAuth } from "@mkuyu/core";
import {
  useConfirmFinanceBudget,
  useCreateFinanceAsset,
  useCreateFinanceBudget,
  useFinanceAssetMeta,
  useFinanceAssets,
  useFinanceBudgetMeta,
  useFinanceBudgets,
  useFinanceConfig,
  useFinanceLockDates,
  useSetFinanceLockDates,
  useValidateFinanceAsset,
} from "@mkuyu/sales";
import type { FinanceAccount, FinanceAsset, FinanceBudget, LockDates } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Input,
  Modal,
  Money,
  PageHeader,
  Select,
  Spinner,
  Tabs,
} from "../../components/ui";

const DATE_FIELDS: Array<{ key: keyof LockDates; label: string; hint: string }> = [
  { key: "fiscalyear_lock_date", label: "Fiscal year lock", hint: "No entry on or before this date can be changed." },
  { key: "tax_lock_date", label: "Tax lock", hint: "Protects tax returns already filed." },
  { key: "sale_lock_date", label: "Sales lock", hint: "Locks customer invoices and credit notes." },
  { key: "purchase_lock_date", label: "Purchase lock", hint: "Locks vendor bills and refunds." },
];

interface BudgetLineForm {
  account_id: string;
  budget_amount: string;
}

const EMPTY_BUDGET_LINE: BudgetLineForm = { account_id: "", budget_amount: "" };

export function FinanceConfigPage() {
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState(params.get("tab") || "accounts");
  const config = useFinanceConfig();
  const assets = useFinanceAssets(tab === "assets");
  const assetMeta = useFinanceAssetMeta(tab === "assets" && can("manage_finance"));
  const createAsset = useCreateFinanceAsset();
  const validateAsset = useValidateFinanceAsset();
  const budgets = useFinanceBudgets(tab === "budgets");
  const budgetMeta = useFinanceBudgetMeta(tab === "budgets" && can("manage_finance"));
  const createBudget = useCreateFinanceBudget();
  const confirmBudget = useConfirmFinanceBudget();
  const lockDates = useFinanceLockDates(tab === "close");
  const saveLockDates = useSetFinanceLockDates();
  const [form, setForm] = useState<LockDates>({ fiscalyear_lock_date: "", tax_lock_date: "", sale_lock_date: "", purchase_lock_date: "" });
  const [assetOpen, setAssetOpen] = useState(false);
  const [assetForm, setAssetForm] = useState({
    name: "", account_asset_id: "", acquisition_date: isoDate(), original_value: "",
    salvage_value: "0", method: "linear", method_number: "12", method_period: "1",
    account_depreciation_id: "", account_depreciation_expense_id: "", journal_id: "",
  });
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ name: "", date_from: isoDate(new Date(new Date().getFullYear(), 0, 1)), date_to: isoDate(), budget_type: "expense" });
  const [budgetLines, setBudgetLines] = useState<BudgetLineForm[]>([{ ...EMPTY_BUDGET_LINE }]);

  useEffect(() => {
    if (lockDates.data) {
      setForm({
        fiscalyear_lock_date: lockDates.data.fiscalyear_lock_date || "",
        tax_lock_date: lockDates.data.tax_lock_date || "",
        sale_lock_date: lockDates.data.sale_lock_date || "",
        purchase_lock_date: lockDates.data.purchase_lock_date || "",
      });
    }
  }, [lockDates.data]);

  function changeTab(value: string) {
    setTab(value);
    setParams(value === "accounts" ? {} : { tab: value });
  }

  async function saveClose() {
    try {
      await saveLockDates.mutateAsync(form);
      push("Lock dates updated.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  function startAsset() {
    setAssetForm({
      name: "", account_asset_id: String(assetMeta.data?.accounts[0]?.id || ""), acquisition_date: isoDate(),
      original_value: "", salvage_value: "0", method: "linear", method_number: "12", method_period: "1",
      account_depreciation_id: String(assetMeta.data?.depreciation_accounts[0]?.id || ""),
      account_depreciation_expense_id: String(assetMeta.data?.expense_accounts[0]?.id || ""),
      journal_id: String(assetMeta.data?.journals[0]?.id || ""),
    });
    setAssetOpen(true);
  }

  async function saveAsset() {
    if (!assetForm.name.trim() || !assetForm.account_asset_id || !Number(assetForm.original_value)) {
      push("Enter a name, fixed-asset account and original value.", "error");
      return;
    }
    try {
      await createAsset.mutateAsync({
        name: assetForm.name.trim(),
        account_asset_id: Number(assetForm.account_asset_id),
        account_depreciation_id: Number(assetForm.account_depreciation_id),
        account_depreciation_expense_id: Number(assetForm.account_depreciation_expense_id),
        journal_id: assetForm.journal_id ? Number(assetForm.journal_id) : undefined,
        acquisition_date: assetForm.acquisition_date,
        original_value: Number(assetForm.original_value),
        salvage_value: Number(assetForm.salvage_value) || 0,
        method: assetForm.method,
        method_number: Number(assetForm.method_number) || 12,
        method_period: assetForm.method_period,
      });
      push("Asset created as a draft.", "success");
      setAssetOpen(false);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function runValidateAsset(asset: FinanceAsset) {
    try {
      await validateAsset.mutateAsync(asset.id);
      push("Asset validated and running.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  function startBudget() {
    setBudgetForm({ name: "", date_from: isoDate(new Date(new Date().getFullYear(), 0, 1)), date_to: isoDate(), budget_type: "expense" });
    setBudgetLines([{ account_id: String(budgetMeta.data?.accounts[0]?.id || ""), budget_amount: "" }]);
    setBudgetOpen(true);
  }

  async function saveBudget() {
    if (!budgetForm.name.trim()) {
      push("Enter a budget name.", "error");
      return;
    }
    const lines = budgetLines
      .filter((line) => line.account_id && line.budget_amount)
      .map((line) => ({ account_id: Number(line.account_id), budget_amount: Number(line.budget_amount) }));
    try {
      await createBudget.mutateAsync({ ...budgetForm, name: budgetForm.name.trim(), lines });
      push("Budget created as a draft.", "success");
      setBudgetOpen(false);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function runConfirmBudget(budget: FinanceBudget) {
    try {
      await confirmBudget.mutateAsync(budget.id);
      push("Budget confirmed.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const accountColumns: Column<FinanceAccount>[] = [
    {
      header: "Account",
      primary: true,
      render: (account) => (
        <>
          <div className="font-medium">{account.name}</div>
          <div className="font-mono text-[11px] text-slate-400">{account.code}</div>
        </>
      ),
    },
    { header: "Type", render: (account) => account.type.replace(/_/g, " ") },
    { header: "Balance", align: "right", render: (account) => account.balance ? <Money value={account.balance} /> : "—" },
  ];

  const assetColumns: Column<FinanceAsset>[] = [
    {
      header: "Asset",
      primary: true,
      render: (asset) => (
        <>
          <div className="font-medium">{asset.name}</div>
          <div className="text-[11px] text-slate-400">{asset.method} · {asset.method_number} periods</div>
        </>
      ),
    },
    { header: "Acquired", render: (asset) => formatDate(asset.acquisition_date) },
    { header: "Original", align: "right", render: (asset) => <Money value={asset.original_value} /> },
    { header: "Book value", align: "right", render: (asset) => <Money value={asset.book_value} /> },
    { header: "Residual", align: "right", render: (asset) => <Money value={asset.value_residual} /> },
    { header: "State", render: (asset) => <Badge tone={asset.state === "draft" ? "warning" : "success"}>{asset.state}</Badge> },
    ...(can("manage_finance") ? [{
      header: "",
      align: "right" as const,
      render: (asset: FinanceAsset) => asset.state === "draft"
        ? <Button variant="secondary" onClick={() => runValidateAsset(asset)} disabled={validateAsset.isPending}>Validate</Button>
        : null,
    }] : []),
  ];

  return (
    <div>
      <PageHeader title="Finance configuration" description="Chart of accounts, journals, taxes, assets, budgets and period close." />
      <Tabs
        tabs={[
          { value: "accounts", label: "Accounts" },
          { value: "journals", label: "Journals" },
          { value: "taxes", label: "Taxes" },
          { value: "assets", label: "Assets" },
          { value: "budgets", label: "Budgets" },
          { value: "close", label: "Period close" },
        ]}
        value={tab}
        onChange={changeTab}
      />

      {(tab === "accounts" || tab === "journals" || tab === "taxes") && (
        config.isLoading ? <Spinner /> : config.isError ? (
          <ErrorState message={config.error?.message || "Could not load finance configuration."} onRetry={() => config.refetch()} />
        ) : (
          <Card>
            {tab === "accounts" && (
              <>
                <CardHeader title="Chart of accounts" subtitle={`${config.data?.accounts.length ?? 0} accounts`} />
                <ResponsiveTable columns={accountColumns} rows={config.data?.accounts ?? []} rowKey={(account) => String(account.id)} emptyText="No accounts." />
              </>
            )}
            {tab === "journals" && (
              <>
                <CardHeader title="Journals" subtitle="Sales, purchase, bank, cash and miscellaneous journals" />
                <ResponsiveTable
                  columns={[
                    { header: "Journal", primary: true, render: (journal) => `${journal.code} · ${journal.name}` },
                    { header: "Type", render: (journal) => journal.type },
                    { header: "Currency", render: (journal) => journal.currency },
                  ]}
                  rows={config.data?.journals ?? []}
                  rowKey={(journal) => String(journal.id)}
                  emptyText="No journals."
                />
              </>
            )}
            {tab === "taxes" && (
              <>
                <CardHeader title="Taxes" subtitle="Sale and purchase taxes configured in Odoo" />
                <ResponsiveTable
                  columns={[
                    { header: "Tax", primary: true, render: (tax) => tax.name },
                    { header: "Rate", align: "right", render: (tax) => `${tax.amount}%` },
                    { header: "Use", render: (tax) => tax.type },
                    { header: "Price included", render: (tax) => tax.price_include ? "Yes" : "No" },
                  ]}
                  rows={config.data?.taxes ?? []}
                  rowKey={(tax) => String(tax.id)}
                  emptyText="No taxes."
                />
              </>
            )}
          </Card>
        )
      )}

      {tab === "assets" && (
        assets.isLoading ? <Spinner /> : assets.isError ? (
          <ErrorState message={assets.error?.message || "Could not load assets."} onRetry={() => assets.refetch()} />
        ) : (
          <Card>
            <CardHeader
              title="Fixed assets"
              subtitle={`${assets.data?.length ?? 0} assets and their book values`}
              actions={can("manage_finance") ? <Button onClick={startAsset}>New asset</Button> : undefined}
            />
            <ResponsiveTable columns={assetColumns} rows={assets.data ?? []} rowKey={(asset) => String(asset.id)} emptyText="No fixed asset recorded." />
          </Card>
        )
      )}

      {tab === "budgets" && (
        budgets.isLoading ? <Spinner /> : budgets.isError ? (
          <ErrorState message={budgets.error?.message || "Could not load budgets."} onRetry={() => budgets.refetch()} />
        ) : (
          <div className="space-y-5">
            {can("manage_finance") && (
              <div className="flex justify-end">
                <Button onClick={startBudget}>New budget</Button>
              </div>
            )}
            {(budgets.data ?? []).map((budget: FinanceBudget) => (
              <Card key={budget.id}>
                <CardHeader
                  title={budget.name}
                  subtitle={`${formatDate(budget.date_from)} – ${formatDate(budget.date_to)} · ${budget.state}`}
                  actions={
                    <div className="flex items-center gap-2">
                      <Badge tone={budget.type === "expense" ? "warning" : "info"}>{budget.type}</Badge>
                      {budget.state === "draft" && can("manage_finance") && (
                        <Button variant="secondary" onClick={() => runConfirmBudget(budget)} disabled={confirmBudget.isPending}>Confirm</Button>
                      )}
                    </div>
                  }
                />
                <ResponsiveTable
                  columns={[
                    { header: "Line", primary: true, render: (line) => line.name },
                    { header: "Account", render: (line) => line.account?.name || "—" },
                    { header: "Budget", align: "right", render: (line) => <Money value={line.budget_amount} /> },
                    { header: "Achieved", align: "right", render: (line) => <Money value={line.achieved_amount} /> },
                    { header: "Status", render: (line) => <Badge tone={line.is_above_budget ? "danger" : "success"}>{line.is_above_budget ? "Over budget" : "Within budget"}</Badge> },
                  ]}
                  rows={budget.lines}
                  rowKey={(line) => String(line.id)}
                  emptyText="No budget line."
                />
              </Card>
            ))}
            {(budgets.data ?? []).length === 0 && <Card><p className="px-5 py-12 text-center text-sm text-slate-400">No budget has been created in Odoo.</p></Card>}
          </div>
        )
      )}

      {tab === "close" && (
        <Card>
          <CardHeader title="Period close" subtitle="Lock dates protect posted entries from later edits." />
          {lockDates.isLoading ? <Spinner /> : (
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              {DATE_FIELDS.map((item) => (
                <Field key={item.key} label={item.label} hint={item.hint}>
                  <Input
                    type="date"
                    value={form[item.key] || ""}
                    onChange={(event) => setForm({ ...form, [item.key]: event.target.value })}
                    disabled={!can("close_period")}
                  />
                </Field>
              ))}
            </div>
          )}
          {can("close_period") && (
            <div className="flex justify-end border-t border-slate-100 px-5 py-4">
              <Button onClick={saveClose} disabled={saveLockDates.isPending}>{saveLockDates.isPending ? "Saving…" : "Save lock dates"}</Button>
            </div>
          )}
        </Card>
      )}

      <Modal
        open={assetOpen}
        onClose={() => setAssetOpen(false)}
        title="New fixed asset"
        description="The asset is saved as a draft; validate it to start depreciation."
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssetOpen(false)} disabled={createAsset.isPending}>Cancel</Button>
            <Button onClick={saveAsset} disabled={createAsset.isPending}>{createAsset.isPending ? "Saving…" : "Save draft"}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Asset name" required><Input value={assetForm.name} onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })} /></Field></div>
          <Field label="Fixed-asset account" required>
            <Select value={assetForm.account_asset_id} onChange={(event) => setAssetForm({ ...assetForm, account_asset_id: event.target.value })}>
              <option value="">Choose account</option>
              {(assetMeta.data?.accounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
            </Select>
          </Field>
          <Field label="Accumulated depreciation account" required>
            <Select value={assetForm.account_depreciation_id} onChange={(event) => setAssetForm({ ...assetForm, account_depreciation_id: event.target.value })}>
              <option value="">Choose account</option>
              {(assetMeta.data?.depreciation_accounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
            </Select>
          </Field>
          <Field label="Depreciation expense account" required>
            <Select value={assetForm.account_depreciation_expense_id} onChange={(event) => setAssetForm({ ...assetForm, account_depreciation_expense_id: event.target.value })}>
              <option value="">Choose account</option>
              {(assetMeta.data?.expense_accounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
            </Select>
          </Field>
          <Field label="Journal">
            <Select value={assetForm.journal_id} onChange={(event) => setAssetForm({ ...assetForm, journal_id: event.target.value })}>
              <option value="">Default miscellaneous journal</option>
              {(assetMeta.data?.journals ?? []).map((journal) => <option key={journal.id} value={journal.id}>{journal.name}</option>)}
            </Select>
          </Field>
          <Field label="Acquisition date"><Input type="date" value={assetForm.acquisition_date} onChange={(event) => setAssetForm({ ...assetForm, acquisition_date: event.target.value })} /></Field>
          <Field label="Original value" required><Input type="number" min={0} step="0.01" value={assetForm.original_value} onChange={(event) => setAssetForm({ ...assetForm, original_value: event.target.value })} /></Field>
          <Field label="Salvage value"><Input type="number" min={0} step="0.01" value={assetForm.salvage_value} onChange={(event) => setAssetForm({ ...assetForm, salvage_value: event.target.value })} /></Field>
          <Field label="Method">
            <Select value={assetForm.method} onChange={(event) => setAssetForm({ ...assetForm, method: event.target.value })}>
              {(assetMeta.data?.methods ?? [{ value: "linear", label: "Straight line" }]).map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
            </Select>
          </Field>
          <Field label="Period">
            <Select value={assetForm.method_period} onChange={(event) => setAssetForm({ ...assetForm, method_period: event.target.value })}>
              <option value="1">Months</option>
              <option value="12">Years</option>
            </Select>
          </Field>
          <Field label="Number of periods"><Input type="number" min={1} value={assetForm.method_number} onChange={(event) => setAssetForm({ ...assetForm, method_number: event.target.value })} /></Field>
        </div>
      </Modal>

      <Modal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title="New budget"
        description="Budget lines use analytic accounts. The budget is saved as a draft."
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setBudgetOpen(false)} disabled={createBudget.isPending}>Cancel</Button>
            <Button onClick={saveBudget} disabled={createBudget.isPending}>{createBudget.isPending ? "Saving…" : "Save draft"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Budget name" required><Input value={budgetForm.name} onChange={(event) => setBudgetForm({ ...budgetForm, name: event.target.value })} /></Field></div>
            <Field label="From"><Input type="date" value={budgetForm.date_from} onChange={(event) => setBudgetForm({ ...budgetForm, date_from: event.target.value })} /></Field>
            <Field label="To"><Input type="date" value={budgetForm.date_to} onChange={(event) => setBudgetForm({ ...budgetForm, date_to: event.target.value })} /></Field>
            <Field label="Type">
              <Select value={budgetForm.budget_type} onChange={(event) => setBudgetForm({ ...budgetForm, budget_type: event.target.value })}>
                <option value="expense">Expense</option>
                <option value="revenue">Revenue</option>
                <option value="both">Both</option>
              </Select>
            </Field>
          </div>
          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Budget lines</p>
              <Button variant="ghost" onClick={() => setBudgetLines((current) => [...current, { ...EMPTY_BUDGET_LINE }])}>Add line</Button>
            </div>
            <div className="space-y-2 p-3">
              {budgetLines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-12">
                  <div className="sm:col-span-8"><Field label="Analytic account">
                    <Select value={line.account_id} onChange={(event) => setBudgetLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, account_id: event.target.value } : item))}>
                      <option value="">Choose account</option>
                      {(budgetMeta.data?.accounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.code ? `${account.code} · ` : ""}{account.name}</option>)}
                    </Select>
                  </Field></div>
                  <div className="sm:col-span-3"><Field label="Amount"><Input type="number" min={0} step="0.01" value={line.budget_amount} onChange={(event) => setBudgetLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, budget_amount: event.target.value } : item))} /></Field></div>
                  <div className="flex items-end justify-end sm:col-span-1">
                    {budgetLines.length > 1 && <Button variant="ghost" onClick={() => setBudgetLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</Button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
