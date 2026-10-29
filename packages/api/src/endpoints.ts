import { apiDownload, apiGet, apiList, apiPatch, apiPost, apiRequest, type QueryValue } from "./client";
import type {
  ApprovalsData,
  Building,
  Buyer,
  ClientDetail,
  ClientRequest,
  ClientSummary,
  CollectionDashboardRow,
  CollectionPayment,
  DashboardData,
  DepartmentBill,
  DepartmentSummary,
  BankReconciliationRow,
  BankStatementLine,
  CashSession,
  CashSessionsData,
  FinanceAsset,
  FinanceAssetMeta,
  FinanceBillDetail,
  FinanceBillMeta,
  FinanceBudget,
  FinanceBudgetMeta,
  FinanceConfig,
  FinanceOverview,
  FinanceReport,
  FinanceReportDefinition,
  Followup,
  InstallmentInput,
  InstallmentPreview,
  InventoryReportRow,
  InvoiceDetail,
  InvoiceSummary,
  JournalEntryDetail,
  JournalEntryMeta,
  LockDates,
  Money,
  OpenItem,
  OrderDetail,
  OrderInput,
  OrderInvoiceResult,
  OrderSummary,
  CatalogProduct,
  CatalogTax,
  CrmActivity,
  CrmLead,
  CrmMeta,
  SubscriptionPlan,
  OverdueRow,
  Payment,
  PaymentPlan,
  PaymentProof,
  PaymentRegistration,
  Schedule,
  Product,
  SalesMe,
  SalesReportData,
  Site,
  StaffLoginData,
  Unit,
} from "./types";

export type ListQuery = Record<string, QueryValue>;

export const authApi = {
  staffLogin: (login: string, password: string) =>
    apiPost<StaffLoginData>("/auth/staff/login", { login, password }, { auth: false }),

  /** Generic session used only to name a user who has no sales role. */
  me: (signal?: AbortSignal) => apiGet<{ id: number; name: string; role: string; companies: Array<{ id: number; name: string }> }>("/me", undefined, signal),

  logout: () => apiPost<{ logged_out: boolean }>("/auth/logout"),
};

export const salesApi = {
  me: (signal?: AbortSignal) => apiGet<SalesMe>("/erp/me", undefined, signal),

  dashboard: (signal?: AbortSignal) => apiGet<DashboardData>("/erp/sales/dashboard", undefined, signal),

  // ---------------------------------------------------------------- inventory
  sites: (signal?: AbortSignal) => apiGet<Site[]>("/erp/sales/sites", undefined, signal),

  createSite: (body: Record<string, unknown> & { name: string; site_code: string }) =>
    apiPost<Site>("/erp/sales/sites", body, { idempotent: true }),

  updateSite: (id: number, body: Record<string, unknown>) => apiPatch<Site>(`/erp/sales/sites/${id}`, body),

  archiveSite: (id: number) => apiPost<Site>(`/erp/sales/sites/${id}/archive`),

  buildings: (siteId?: number | string, signal?: AbortSignal) =>
    apiGet<Building[]>("/erp/sales/buildings", siteId ? { site_id: siteId } : undefined, signal),

  createBuilding: (body: Record<string, unknown> & { name: string; site_id: number }) =>
    apiPost<Building>("/erp/sales/buildings", body, { idempotent: true }),

  updateBuilding: (id: number, body: Record<string, unknown>) => apiPatch<Building>(`/erp/sales/buildings/${id}`, body),

  archiveBuilding: (id: number) => apiPost<Building>(`/erp/sales/buildings/${id}/archive`),

  units: (query: ListQuery, signal?: AbortSignal) => apiList<Unit>("/erp/sales/units", query, signal),

  unit: (id: number | string, signal?: AbortSignal) => apiGet<Unit>(`/erp/sales/units/${id}`, undefined, signal),

  createUnit: (body: Record<string, unknown> & { name: string; unit_code: string; unit_type: string }) =>
    apiPost<Unit>("/erp/sales/units", body, { idempotent: true }),

  updateUnit: (id: number, body: Record<string, unknown>) => apiPatch<Unit>(`/erp/sales/units/${id}`, body),

  archiveUnit: (id: number) => apiPost<Unit>(`/erp/sales/units/${id}/archive`),

  reserveUnit: (id: number, buyerId: number) =>
    apiPost<{ unit: Unit; invoice: InvoiceSummary | null }>(`/erp/sales/units/${id}/reserve`, { buyer_id: buyerId }),

  cancelReservation: (id: number) => apiPost<Unit>(`/erp/sales/units/${id}/cancel-reservation`),

  handoverUnit: (id: number) => apiPost<Unit>(`/erp/sales/units/${id}/handover`),

  // ------------------------------------------------------------------- buyers
  buyers: (query: ListQuery, signal?: AbortSignal) => apiList<Buyer>("/erp/sales/buyers", query, signal),

  buyer: (id: number | string, signal?: AbortSignal) => apiGet<Buyer>(`/erp/sales/buyers/${id}`, undefined, signal),

  createBuyer: (body: Record<string, unknown> & { name: string }) =>
    apiPost<Buyer>("/erp/sales/buyers", body, { idempotent: true }),

  updateBuyer: (id: number, body: Record<string, unknown>) => apiPatch<Buyer>(`/erp/sales/buyers/${id}`, body),

  archiveBuyer: (id: number) => apiPost<Buyer>(`/erp/sales/buyers/${id}/archive`),

  // ------------------------------------------------------------------- orders
  orders: (query: ListQuery, signal?: AbortSignal) => apiList<OrderSummary>("/erp/sales/orders", query, signal),

  order: (id: number | string, signal?: AbortSignal) => apiGet<OrderDetail>(`/erp/sales/orders/${id}`, undefined, signal),

  createOrder: (body: OrderInput) => apiPost<OrderDetail>("/erp/sales/orders", body, { idempotent: true }),

  updateOrder: (id: number, body: Partial<OrderInput>) => apiPatch<OrderDetail>(`/erp/sales/orders/${id}`, body),

  confirmOrder: (id: number) => apiPost<OrderDetail>(`/erp/sales/orders/${id}/confirm`),

  cancelOrder: (id: number) => apiPost<OrderDetail>(`/erp/sales/orders/${id}/cancel`),

  approveOrder: (id: number) => apiPost<OrderDetail>(`/erp/sales/orders/${id}/approve`),

  approveOrderFinance: (id: number) => apiPost<OrderDetail>(`/erp/sales/orders/${id}/approve-finance`),

  createOrderInvoice: (id: number) => apiPost<OrderInvoiceResult>(`/erp/sales/orders/${id}/invoice`),

  approvals: (signal?: AbortSignal) => apiGet<ApprovalsData>("/erp/sales/approvals", undefined, signal),

  products: (search?: string, signal?: AbortSignal) =>
    apiGet<Product[]>("/erp/sales/products", search ? { search } : undefined, signal),

  installmentPreview: (orderId: number, query: { total_price?: string | number; installment_count: number; first_date?: string }) =>
    apiGet<InstallmentPreview>(`/erp/sales/orders/${orderId}/installments/preview`, query),

  createInstallments: (orderId: number, body: InstallmentInput) =>
    apiPost<{ order: OrderDetail; subscription: OrderSummary | null }>(`/erp/sales/orders/${orderId}/installments`, body, { idempotent: true }),

  // ------------------------------------------------------------------ billing
  invoices: (query: ListQuery, signal?: AbortSignal) => apiList<InvoiceSummary>("/erp/sales/invoices", query, signal),

  invoice: (id: number | string, signal?: AbortSignal) => apiGet<InvoiceDetail>(`/erp/sales/invoices/${id}`, undefined, signal),

  createCreditNote: (invoiceId: number, body: { reason?: string; date?: string }) =>
    apiPost<InvoiceDetail>(`/erp/sales/invoices/${invoiceId}/credit-note`, body, { idempotent: true }),

  creditNotes: (query: ListQuery, signal?: AbortSignal) =>
    apiList<InvoiceSummary>("/erp/sales/credit-notes", query, signal),

  creditNote: (id: number | string, signal?: AbortSignal) =>
    apiGet<InvoiceDetail>(`/erp/sales/credit-notes/${id}`, undefined, signal),

  approveCreditNote: (id: number) => apiPost<InvoiceDetail>(`/erp/sales/credit-notes/${id}/approve`),

  approveCreditNoteFinance: (id: number) => apiPost<InvoiceDetail>(`/erp/sales/credit-notes/${id}/approve-finance`),

  postCreditNote: (id: number) => apiPost<InvoiceDetail>(`/erp/sales/credit-notes/${id}/post`),

  postInvoice: (id: number) => apiPost<InvoiceDetail>(`/erp/sales/invoices/${id}/post`),

  registerPayment: (invoiceId: number, body: { amount?: string | number; date?: string; reference?: string; journal_id?: number; payment_method_line_id?: number }) =>
    apiPost<PaymentRegistration>(`/erp/sales/invoices/${invoiceId}/payment`, body, { idempotent: true }),

  payments: (query: ListQuery, signal?: AbortSignal) => apiList<Payment>("/erp/sales/payments", query, signal),

  // ------------------------------------------------------------------ finance
  financeOverview: (signal?: AbortSignal) =>
    apiGet<FinanceOverview>("/erp/finance/overview", undefined, signal),

  financeBills: (query: ListQuery, signal?: AbortSignal) =>
    apiList<InvoiceSummary>("/erp/finance/bills", query, signal),

  financeBill: (id: number | string, signal?: AbortSignal) =>
    apiGet<FinanceBillDetail>(`/erp/finance/bills/${id}`, undefined, signal),

  financeBillMeta: (signal?: AbortSignal) =>
    apiGet<FinanceBillMeta>("/erp/finance/bill-meta", undefined, signal),

  createFinanceBill: (body: Record<string, unknown>) =>
    apiPost<FinanceBillDetail>("/erp/finance/bills", body, { idempotent: true }),

  postFinanceBill: (id: number) => apiPost<FinanceBillDetail>(`/erp/finance/bills/${id}/post`),

  cancelFinanceBill: (id: number) => apiPost<FinanceBillDetail>(`/erp/finance/bills/${id}/cancel`),

  payFinanceBill: (id: number, body: { amount?: number | string; date?: string; reference?: string; journal_id?: number }) =>
    apiPost<{ bill: FinanceBillDetail; payments: Array<{ id: number; name: string; amount: Money }> }>(
      `/erp/finance/bills/${id}/payment`, body, { idempotent: true }),

  journalEntries: (query: ListQuery, signal?: AbortSignal) =>
    apiList<InvoiceSummary>("/erp/finance/journal-entries", query, signal),

  journalEntry: (id: number | string, signal?: AbortSignal) =>
    apiGet<JournalEntryDetail>(`/erp/finance/journal-entries/${id}`, undefined, signal),

  journalEntryMeta: (signal?: AbortSignal) =>
    apiGet<JournalEntryMeta>("/erp/finance/journal-entry-meta", undefined, signal),

  createJournalEntry: (body: Record<string, unknown>) =>
    apiPost<JournalEntryDetail>("/erp/finance/journal-entries", body, { idempotent: true }),

  postJournalEntry: (id: number) => apiPost<JournalEntryDetail>(`/erp/finance/journal-entries/${id}/post`),

  cancelJournalEntry: (id: number) => apiPost<JournalEntryDetail>(`/erp/finance/journal-entries/${id}/cancel`),

  bankReconciliation: (signal?: AbortSignal) =>
    apiGet<BankReconciliationRow[]>("/erp/finance/bank-reconciliation", undefined, signal),

  bankReconciliationLines: (query: ListQuery, signal?: AbortSignal) =>
    apiList<BankStatementLine>("/erp/finance/bank-reconciliation/lines", query, signal),

  bankReconciliationCandidates: (lineId: number | string, query?: ListQuery, signal?: AbortSignal) =>
    apiGet<OpenItem[]>(`/erp/finance/bank-reconciliation/lines/${lineId}/candidates`, query, signal),

  matchBankLine: (lineId: number | string, moveLineIds: number[]) =>
    apiPost<BankStatementLine>(`/erp/finance/bank-reconciliation/lines/${lineId}/match`, { move_line_ids: moveLineIds }),

  cashSessions: (query: ListQuery, signal?: AbortSignal) =>
    apiGet<CashSessionsData>("/erp/finance/cash-sessions", query, signal),

  openCashSession: (body: { journal_id: number; date?: string; opening_balance?: number | string; note?: string }) =>
    apiPost<CashSession>("/erp/finance/cash-sessions", body, { idempotent: true }),

  closeCashSession: (id: number, body: { counted_balance: number | string; note?: string }) =>
    apiPost<CashSession>(`/erp/finance/cash-sessions/${id}/close`, body),

  financeConfig: (signal?: AbortSignal) =>
    apiGet<FinanceConfig>("/erp/finance/config", undefined, signal),

  financeAssets: (signal?: AbortSignal) =>
    apiGet<FinanceAsset[]>("/erp/finance/assets", undefined, signal),

  financeAssetMeta: (signal?: AbortSignal) =>
    apiGet<FinanceAssetMeta>("/erp/finance/asset-meta", undefined, signal),

  createFinanceAsset: (body: Record<string, unknown>) =>
    apiPost<FinanceAsset>("/erp/finance/assets", body, { idempotent: true }),

  validateFinanceAsset: (id: number) =>
    apiPost<FinanceAsset>(`/erp/finance/assets/${id}/validate`),

  financeBudgets: (signal?: AbortSignal) =>
    apiGet<FinanceBudget[]>("/erp/finance/budgets", undefined, signal),

  financeBudgetMeta: (signal?: AbortSignal) =>
    apiGet<FinanceBudgetMeta>("/erp/finance/budget-meta", undefined, signal),

  createFinanceBudget: (body: Record<string, unknown>) =>
    apiPost<FinanceBudget>("/erp/finance/budgets", body, { idempotent: true }),

  confirmFinanceBudget: (id: number) =>
    apiPost<FinanceBudget>(`/erp/finance/budgets/${id}/confirm`),

  financeLockDates: (signal?: AbortSignal) =>
    apiGet<LockDates>("/erp/finance/lock-dates", undefined, signal),

  setFinanceLockDates: (body: Partial<LockDates>) =>
    apiPost<LockDates>("/erp/finance/lock-dates", body),

  financeReports: (signal?: AbortSignal) =>
    apiGet<FinanceReportDefinition[]>("/erp/finance/reports", undefined, signal),

  financeReport: (code: string, query: ListQuery, signal?: AbortSignal) =>
    apiGet<FinanceReport>(`/erp/finance/reports/${code}`, query, signal),

  // -------------------------------------------------------------- department
  departmentSummary: (signal?: AbortSignal) =>
    apiGet<DepartmentSummary>("/erp/department/summary", undefined, signal),

  departmentBills: (query: ListQuery, signal?: AbortSignal) =>
    apiList<DepartmentBill>("/erp/department/bills", query, signal),

  approveDepartmentBill: (id: number) => apiPost<{ id: number; state: string }>(`/erp/department/bills/${id}/approve`),

  rejectDepartmentBill: (id: number, reason: string) =>
    apiPost<{ id: number; state: string }>(`/erp/department/bills/${id}/reject`, { reason }),

  // ----------------------------------------------------------------- catalog
  catalogProducts: (query: ListQuery, signal?: AbortSignal) =>
    apiList<CatalogProduct>("/erp/catalog/products", query, signal),

  createCatalogProduct: (body: Record<string, unknown>) =>
    apiPost<CatalogProduct>("/erp/catalog/products", body, { idempotent: true }),

  updateCatalogProduct: (id: number, body: Record<string, unknown>) =>
    apiPatch<CatalogProduct>(`/erp/catalog/products/${id}`, body),

  catalogTaxes: (signal?: AbortSignal) => apiGet<CatalogTax[]>("/erp/catalog/taxes", undefined, signal),

  catalogPlans: (signal?: AbortSignal) => apiGet<SubscriptionPlan[]>("/erp/catalog/plans", undefined, signal),

  createCatalogPlan: (body: Record<string, unknown>) =>
    apiPost<SubscriptionPlan>("/erp/catalog/plans", body, { idempotent: true }),

  updateCatalogPlan: (id: number, body: Record<string, unknown>) =>
    apiPatch<SubscriptionPlan>(`/erp/catalog/plans/${id}`, body),

  // --------------------------------------------------------------------- CRM
  crmLeads: (query: ListQuery, signal?: AbortSignal) => apiList<CrmLead>("/erp/crm/leads", query, signal),

  crmLead: (id: number | string, signal?: AbortSignal) => apiGet<CrmLead>(`/erp/crm/leads/${id}`, undefined, signal),

  createCrmLead: (body: Record<string, unknown>) => apiPost<CrmLead>("/erp/crm/leads", body, { idempotent: true }),

  updateCrmLead: (id: number, body: Record<string, unknown>) => apiPatch<CrmLead>(`/erp/crm/leads/${id}`, body),

  moveCrmLeadStage: (id: number, stageId: number) =>
    apiPost<CrmLead>(`/erp/crm/leads/${id}/stage`, { stage_id: stageId }),

  crmMeta: (signal?: AbortSignal) => apiGet<CrmMeta>("/erp/crm/meta", undefined, signal),

  crmActivities: (leadId: number, signal?: AbortSignal) =>
    apiGet<CrmActivity[]>(`/erp/crm/leads/${leadId}/activities`, undefined, signal),

  createCrmActivity: (leadId: number, body: { summary: string; date_deadline: string; user_id?: number }) =>
    apiPost<{ id: number }>(`/erp/crm/leads/${leadId}/activities`, body, { idempotent: true }),

  // ---------------------------------------------------------------- collections
  clients: (query: ListQuery, signal?: AbortSignal) => apiList<ClientSummary>("/clients", query, signal),

  client: (id: number | string, signal?: AbortSignal) => apiGet<ClientDetail>(`/clients/${id}`, undefined, signal),

  plans: (clientId: number | string, signal?: AbortSignal) =>
    apiGet<PaymentPlan[]>(`/clients/${clientId}/plans`, undefined, signal),

  schedule: (clientId: number | string, planId: number | string, signal?: AbortSignal) =>
    apiRequest<Schedule>(`/clients/${clientId}/plans/${planId}/schedule`, { method: "GET", signal }),

  clientPayments: (clientId: number | string, unitId?: number | string, signal?: AbortSignal) =>
    apiGet<CollectionPayment[]>(`/clients/${clientId}/payments`, unitId ? { unit_id: unitId } : undefined, signal),

  collectionsDashboard: (query: ListQuery, signal?: AbortSignal) =>
    apiGet<CollectionDashboardRow[]>("/dashboard/collections", query, signal),

  downloadClientStatement: (clientId: number, unitId: number) =>
    apiDownload(`/clients/${clientId}/statement?unit_id=${unitId}`, `statement-unit-${unitId}.pdf`),

  overdue: (query: ListQuery, signal?: AbortSignal) => apiList<OverdueRow>("/overdue", query, signal),

  followups: (clientId: number | string, unitId?: number | string, signal?: AbortSignal) =>
    apiGet<Followup[]>(`/clients/${clientId}/followups`, unitId ? { unit_id: unitId } : undefined, signal),

  createFollowup: (clientId: number | string, body: {
    unit_id: number;
    channel: string;
    note: string;
    promise_amount?: string | number | null;
    promise_to_pay_date?: string | null;
    next_followup_date?: string | null;
  }) => apiPost<Followup>(`/clients/${clientId}/followups`, body, { idempotent: true }),

  paymentProofs: (query: ListQuery, signal?: AbortSignal) =>
    apiList<PaymentProof>("/erp/collections/payment-proofs", query, signal),

  paymentProofAction: (proofId: number, action: string, reason?: string) =>
    apiPost<{ id: number; name: string; state: string }>(`/erp/collections/payment-proofs/${proofId}/action`, { action, reason }),

  clientRequests: (query: ListQuery, signal?: AbortSignal) =>
    apiList<ClientRequest>("/client-requests", query, signal),

  clientRequestAction: (requestId: number, action: string) =>
    apiPost<{ id: number; name: string; state: string }>(`/erp/collections/client-requests/${requestId}/action`, { action }),

  // ------------------------------------------------------------------ reports
  reportInventory: (signal?: AbortSignal) =>
    apiGet<InventoryReportRow[]>("/erp/sales/reports/inventory", undefined, signal),

  reportSales: (query: ListQuery, signal?: AbortSignal) =>
    apiGet<SalesReportData>("/erp/sales/reports/sales", query, signal),

  // ------------------------------------------------------------------- PDFs
  downloadCdlInvoice: (moveId: number, name: string) =>
    apiDownload(`/erp/reports/cdl/invoice/${moveId}`, `${name || "invoice"}.pdf`),

  downloadCdlReceipt: (paymentId: number, name: string) =>
    apiDownload(`/erp/reports/cdl/receipt/${paymentId}`, `${name || "receipt"}.pdf`),

  downloadCdlStatement: (partnerId: number, asAt: string) =>
    apiDownload(`/erp/reports/cdl/statement/${partnerId}?as_at=${encodeURIComponent(asAt)}`, `statement-${partnerId}.pdf`),
};
