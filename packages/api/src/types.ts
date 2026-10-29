// Shared API contract for the MKUYU ERP sales workspace.

export interface Money {
  amount: string;
  currency: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiList<T> {
  data: T[];
  meta: PageMeta;
}

export type Scope = "staff" | "client";
export type StaffRole = "sales" | "collection" | "finance" | "manager" | "staff";

export interface Company {
  id: number;
  name: string;
}

export interface StaffUser {
  id: number;
  name: string;
  role: StaffRole;
  partner_id?: number | null;
  companies?: Company[];
}

export interface StaffLoginData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: StaffUser;
}

export interface MeStaff {
  id: number;
  name: string;
  role: StaffRole;
  partner_id?: number | null;
  companies: Company[];
}

export type SalesRole = "director" | "manager" | "agent" | "admin";

export type ErpRole =
  | "ceo"
  | "cfo"
  | "it_lead"
  | "finance"
  | "financial_controller"
  | "treasurer"
  | "tax_manager"
  | "master_data"
  | "collection_lead"
  | "collection_officer"
  | "project_team"
  | "cashier"
  | "sales_director"
  | "sales_manager"
  | "sales_agent"
  | "sales_admin"
  | "fp_a"
  | "auditor"
  | "legal"
  | "department_head";

export type SalesPermission =
  | "view_dashboard"
  | "view_units"
  | "manage_units"
  | "archive_units"
  | "manage_sites"
  | "archive_sites"
  | "manage_buildings"
  | "archive_buildings"
  | "view_buyers"
  | "manage_buyers"
  | "archive_buyers"
  | "view_orders"
  | "view_crm"
  | "manage_crm"
  | "view_catalog"
  | "manage_catalog_products"
  | "manage_catalog_plans"
  | "create_orders"
  | "edit_orders"
  | "delete_orders"
  | "confirm_orders"
  | "approve_discounts"
  | "approve_finance"
  | "view_approvals"
  | "view_invoices"
  | "create_invoices"
  | "post_invoices"
  | "register_payments"
  | "view_payments"
  | "create_installments"
  | "create_credit_notes"
  | "approve_credit_notes"
  | "post_credit_notes"
  | "view_payment_proofs"
  | "review_payment_proofs"
  | "view_client_requests"
  | "review_client_requests"
  | "view_followups"
  | "write_followups"
  | "view_collections"
  | "view_finance_dashboard"
  | "view_department"
  | "approve_department"
  | "view_finance"
  | "manage_finance"
  | "post_bills"
  | "manage_journal"
  | "close_period"
  | "view_finance_reports"
  | "view_cash"
  | "manage_cash"
  | "reserve_units"
  | "handover_units"
  | "setup_master_data"
  | "view_reports";

export interface SalesPermissions extends Record<SalesPermission, boolean> {
  is_sales: boolean;
  is_erp: boolean;
  erp_role: ErpRole | null;
  sales_role: SalesRole | null;
}

export interface SalesMe {
  user: { id: number; name: string; email: string };
  companies: Company[];
  erp_role: ErpRole;
  sales_role: SalesRole | null;
  permissions: SalesPermissions;
}

export interface CodeLabel {
  code: string;
  label: string;
}

export interface Ref {
  id: number;
  name: string;
}

export interface SiteRef extends Ref {
  code: string;
}

export interface BuildingRef extends SiteRef {
  site_id?: number;
}

export interface BuyerRef extends Ref {
  phone: string;
  email: string;
  national_id: string;
  customer_id: string;
}

export interface UnitRef extends Ref {
  unit_code: string;
  status: CodeLabel;
  site: SiteRef | null;
  building: BuildingRef | null;
  list_price: Money;
}

export interface Unit extends UnitRef {
  unit_type: CodeLabel;
  floor: number;
  size_sqm: number;
  reservation_deposit: Money;
  buyer: BuyerRef | null;
  sale_order: Ref | null;
  reservation_date: string | null;
  sold_date: string | null;
  handover_date: string | null;
  active: boolean;
  currency: string;
  rate_per_sqm?: Money;
  fixed_price?: Money;
  tax?: Ref | null;
  notes?: string;
  company?: Ref;
  reservation_invoice?: InvoiceSummary | null;
  created?: string | null;
}

export interface Site {
  id: number;
  name: string;
  code: string;
  value: Money;
  notes: string;
  company: Ref;
  building_count: number;
  unit_count: number;
  available_count: number;
  reserved_count: number;
  sold_count: number;
  handed_over_count: number;
  active: boolean;
}

export interface Building {
  id: number;
  name: string;
  code: string;
  site: SiteRef | null;
  value: Money;
  notes: string;
  company: Ref;
  unit_count: number;
  available_count: number;
  reserved_count: number;
  sold_count: number;
  handed_over_count: number;
  active: boolean;
}

export interface Buyer {
  id: number;
  name: string;
  phone: string;
  email: string;
  national_id: string;
  customer_id: string;
  city: string;
  active: boolean;
  unit_count: number;
  order_count: number;
  units?: UnitRef[];
  orders?: OrderSummary[];
  street?: string;
  street2?: string;
  zip?: string;
  country?: string;
  vat?: string;
  website?: string;
  notes?: string;
}

export interface OrderLine {
  id: number;
  product: Ref | null;
  name: string;
  quantity: number;
  price_unit: Money;
  discount: number;
  subtotal: Money;
}

export interface InstallmentsInfo {
  id: number;
  name: string;
  state: CodeLabel;
  count: number | null;
  first_date: string | null;
  end_date: string | null;
  amount: Money;
  balance: Money;
}

export interface OrderSummary {
  id: number;
  name: string;
  state: CodeLabel;
  date_order: string | null;
  partner: BuyerRef | null;
  unit: UnitRef | null;
  amount_untaxed: Money;
  amount_tax: Money;
  amount_total: Money;
  currency: string;
  salesperson: Ref | null;
  approval_required: boolean;
  approval_director: Ref | null;
  approval_finance: Ref | null;
  subscription: boolean;
  payment_type: "full" | "down_payment" | "installments";
  invoice_status: CodeLabel;
}

export interface OrderDetail extends OrderSummary {
  lines: OrderLine[];
  notes: string;
  client_order_ref: string;
  invoices: InvoiceSummary[];
  installments: InstallmentsInfo | null;
}

export interface InvoiceSummary {
  id: number;
  name: string;
  type: string;
  state: CodeLabel;
  payment_state: CodeLabel;
  invoice_date: string | null;
  due_date: string | null;
  partner: BuyerRef | null;
  amount_total: Money;
  amount_residual: Money;
  currency: string;
  origin: string;
  reversed_entry: Ref | null;
  approval_required: boolean;
  approval_director: Ref | null;
  approval_finance: Ref | null;
}

export interface InvoiceLine {
  id: number;
  name: string;
  quantity: number;
  price_unit: Money;
  discount: number;
  subtotal: Money;
  product: Ref | null;
}

export interface InvoiceDetail extends InvoiceSummary {
  lines: InvoiceLine[];
  notes: string;
}

export interface Payment {
  id: number;
  name: string;
  date: string | null;
  amount: Money;
  partner: BuyerRef | null;
  state: CodeLabel;
  reference: string;
  method: string;
  currency: string;
}

// ------------------------------------------------------------------- finance

export interface FinanceAccount {
  id: number;
  code: string;
  name: string;
  type: string;
  balance?: Money;
}

export interface LockDates {
  fiscalyear_lock_date: string | null;
  tax_lock_date: string | null;
  sale_lock_date: string | null;
  purchase_lock_date: string | null;
}

export interface FinanceOverview {
  receivable: Money[];
  receivable_overdue: Money[];
  payable: Money[];
  payable_overdue: Money[];
  draft_bills: number;
  draft_documents: number;
  draft_entries: number;
  unreconciled_bank_lines: number;
  open_cash_sessions: number;
  cash_journals: number;
  cash_and_bank: Money[];
  lock_dates: LockDates;
  company: Ref;
}

export interface FinanceBillLine {
  id: number;
  name: string;
  quantity: number;
  price_unit: Money;
  discount: number;
  subtotal: Money;
  account: Ref | null;
  taxes: Array<{ id: number; name: string; amount: number }>;
  product: Ref | null;
}

export interface FinanceBillDetail extends InvoiceDetail {
  journal: Ref | null;
  reference: string;
  account: Ref | null;
  department: Ref | null;
  department_state: string | null;
  lines: FinanceBillLine[];
}

export interface FinanceBillMeta {
  partners: BuyerRef[];
  taxes: Array<{ id: number; name: string; amount: number; price_include: boolean }>;
  accounts: FinanceAccount[];
  journals: Ref[];
  payment_journals: Array<Ref & { type: string }>;
  currency: string;
}

export interface JournalEntryLine {
  id: number;
  name: string;
  account: Ref | null;
  partner: BuyerRef | null;
  debit: Money;
  credit: Money;
  balance: Money;
  currency: string;
}

export interface JournalEntryDetail extends InvoiceSummary {
  journal: Ref | null;
  reference: string;
  lines: JournalEntryLine[];
}

export interface JournalEntryMeta {
  accounts: FinanceAccount[];
  journals: Array<Ref & { type: string }>;
  currency: string;
}

export interface BankReconciliationRow {
  journal: Ref;
  type: string;
  currency: string;
  unreconciled: number;
  total: number;
  balance: Money;
}

export interface BankStatementLine {
  id: number;
  date: string | null;
  name: string;
  partner: BuyerRef | null;
  amount: Money;
  journal: Ref;
  move: Ref;
  state: string;
  reconciled: boolean;
}

export interface OpenItem {
  id: number;
  move: Ref;
  move_type: string;
  date: string | null;
  partner: BuyerRef | null;
  account: Ref;
  name: string;
  amount_residual: Money;
  currency: string;
  matched: boolean;
}

export interface CashJournalRow {
  journal: Ref;
  currency: string;
  current_balance: Money;
  today_net: Money;
  suggested_opening: Money;
  open_session: boolean;
}

export interface CashSession {
  id: number;
  name: string;
  date: string | null;
  state: "open" | "closed";
  journal: Ref;
  opening_balance: Money;
  net_movement: Money;
  expected_balance: Money;
  counted_balance: Money | null;
  difference: Money | null;
  opened_by: Ref | null;
  closed_by: Ref | null;
  closed_on: string | null;
  note: string;
  currency: string;
}

export interface CashSessionsData {
  journals: CashJournalRow[];
  sessions: CashSession[];
  today: string;
}

export interface FinanceConfig {
  accounts: FinanceAccount[];
  journals: Array<Ref & { type: string; code: string; currency: string }>;
  taxes: Array<{ id: number; name: string; amount: number; type: string; price_include: boolean }>;
}

export interface FinanceAsset {
  id: number;
  name: string;
  state: string;
  acquisition_date: string | null;
  original_value: Money;
  book_value: Money;
  value_residual: Money;
  method: string;
  method_number: number;
  method_period: number;
  currency: string;
}

export interface FinanceAssetMeta {
  accounts: Array<{ id: number; code: string; name: string }>;
  depreciation_accounts: Array<{ id: number; code: string; name: string }>;
  expense_accounts: Array<{ id: number; code: string; name: string }>;
  journals: Array<{ id: number; name: string }>;
  methods: Array<{ value: string; label: string }>;
  currency: string;
}

export interface FinanceBudgetMeta {
  accounts: Array<{ id: number; code: string; name: string }>;
  currency: string;
}

export interface FinanceBudgetLine {
  id: number;
  name: string;
  account: Ref | null;
  date_from: string | null;
  date_to: string | null;
  budget_amount: Money;
  achieved_amount: Money;
  is_above_budget: boolean;
  currency: string;
}

export interface FinanceBudget {
  id: number;
  name: string;
  date_from: string | null;
  date_to: string | null;
  state: string;
  type: string;
  lines: FinanceBudgetLine[];
}

export interface FinanceReportDefinition {
  code: string;
  name: string;
  report_id: number;
}

export interface FinanceReportColumn {
  name: string;
  value: number | null;
  display: string;
  style: string;
}

export interface FinanceReportLine {
  id: string;
  name: string;
  level: number;
  unfoldable: boolean;
  columns: FinanceReportColumn[];
}

export interface FinanceReport {
  name: string;
  company: string;
  currency: string;
  headers: string[][];
  lines: FinanceReportLine[];
  warnings: Record<string, unknown>;
}

export interface Product {
  id: number;
  name: string;
  default_code: string;
  list_price: Money;
  type: CodeLabel;
  taxes: Array<{ id: number; name: string; amount: number; amount_type: string }>;
}

export interface InstallmentPreview {
  total_price: Money;
  down_payment: Money;
  balance: Money;
  installment_count: number;
  first_date: string | null;
  installment_amount: Money;
  end_date: string | null;
  rounding_difference: Money;
}

export interface DashboardData {
  finance: {
    draft_invoices: number;
    draft_value_by_currency: Money[];
    overdue_invoices: number;
    overdue_value_by_currency: Money[];
    payments_this_month: number;
    payments_value_by_currency: Money[];
  };
  pending_finance: { orders: number; credit_notes: number };
  inventory: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
    handed_over: number;
    value_available_by_currency: Money[];
  };
  orders: {
    draft: number;
    sent: number;
    confirmed: number;
    cancelled: number;
    this_month_count: number;
    this_month_value_by_currency: Money[];
  };
  approvals: { orders: number; credit_notes: number };
  awaiting_finance: { orders: number; credit_notes: number };
  my_orders: { count: number; value_by_currency: Money[] };
  recent_orders: OrderSummary[];
  units_by_site: Array<{ site: SiteRef; total: number; available: number; reserved: number; sold: number; handed_over: number }>;
}

export interface ApprovalsData {
  orders: OrderSummary[];
  credit_notes: InvoiceSummary[];
  finance: { orders: OrderSummary[]; credit_notes: InvoiceSummary[] };
  awaiting_finance: { orders: OrderSummary[]; credit_notes: InvoiceSummary[] };
}

export interface OverdueRow {
  client_id: number;
  name: string;
  unit_id: number;
  unit_code: string;
  unit_name: string;
  unit_type?: string;
  site_name?: string | null;
  building_name?: string | null;
  overdue_amount: Money;
  oldest_overdue_date?: string | null;
  days_overdue: number;
  last_followup_date?: string | null;
  next_followup_date?: string | null;
}

export interface Followup {
  id: number;
  unit_id: number;
  channel: string;
  note: string;
  promise_amount?: Money | null;
  promise_to_pay_date?: string | null;
  next_followup_date?: string | null;
  date: string;
  user: string;
}

export interface PaymentProof {
  id: number;
  partner_id: number;
  client_name: string;
  client_code: string;
  unit_id: number | false;
  unit_code: string | false;
  description: string;
  amount: Money;
  paid_on: string | false;
  reference: string | false;
  payment_method: string | false;
  invoice_id: number | false;
  invoice_name: string | false;
  state: string;
  workflow_state?: string;
  created: string;
  attachments: Array<{ id: number; name: string; mimetype: string }>;
}

export interface ClientRequest {
  id: number;
  partner_id: number;
  client_name: string;
  client_code: string;
  unit_id: number | false;
  unit_code: string | false;
  request_type: string;
  description: string;
  amount: Money;
  state: string;
  created: string;
  attachments: Array<{ id: number; name: string; mimetype: string }>;
}

export interface CatalogProduct extends Product {
  description: string;
  recurring_invoice: boolean;
  sale_ok: boolean;
  purchase_ok: boolean;
  category: Ref | null;
  uom: Ref | null;
  tax_ids: number[];
  company: Ref | null;
}

export interface CatalogTax {
  id: number;
  name: string;
  amount: number;
  amount_type: string;
  price_include: boolean;
  active: boolean;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  billing_period_value: number;
  billing_period_unit: string;
  active: boolean;
}

export interface DepartmentBill extends InvoiceSummary {
  department: Ref | null;
  department_state: "pending" | "approved" | "rejected";
  department_approved_by: Ref | null;
  department_approved_on: string | null;
  department_rejection: string;
}

export interface DepartmentSummary {
  department: Ref | null;
  pending: number;
  approved: number;
  rejected: number;
  bills: number;
}

export interface CrmLead {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  mobile: string;
  partner: BuyerRef | null;
  stage: Ref;
  stage_id: number;
  salesperson: Ref | null;
  team: Ref | null;
  expected_revenue: Money;
  probability: number;
  date_deadline: string | null;
  description: string;
  tags: Array<{ id: number; name: string }>;
  lost_reason: Ref | null;
  active: boolean;
  created: string | null;
  company: Ref;
}

export interface CrmMeta {
  stages: Array<{ id: number; name: string; sequence: number; is_won: boolean }>;
  teams: Ref[];
  users: Ref[];
  lost_reasons: Ref[];
}

export interface CrmActivity {
  id: number;
  summary: string;
  date_deadline: string | null;
  user: Ref | null;
  type: Ref | null;
}

export interface ClientSummary {
  id: number;
  name: string;
  phone: string;
  client_code: string;
  unit_count: number;
  balance: Money;
  overdue_amount: Money;
}

export interface ClientProperty {
  unit_id: number;
  unit_code: string;
  unit_name: string;
  unit_type: string;
  size_sqm: number | null;
  status: string;
  site: { id: number; name: string; code?: string } | null;
  building: { id: number; name: string; code?: string } | null;
}

export interface ClientDetail extends ClientSummary {
  email: string;
  national_id: string;
  properties: ClientProperty[];
}

export interface PaymentPlan {
  plan_id: number;
  name: string;
  unit_id: number;
  unit_code: string;
  payment_type: "full" | "down_payment";
  total_payable: Money;
  amount_paid: Money;
  residual: Money;
  overdue_amount: Money;
  down_payment_percent?: number;
  down_payment_amount?: Money;
  installment_count?: number;
  installment_amount?: Money;
  state?: string;
}

export interface ScheduleLine {
  sequence: number;
  label: string;
  due_date: string;
  amount_due: Money;
  cumulative_due: Money;
  paid: Money;
  balance: Money;
  status: string;
  days_overdue: number;
}

export interface Schedule {
  data: ScheduleLine[];
  meta: {
    plan_id?: number;
    unit_code?: string;
    total_payable: Money;
    paid?: Money;
    amount_paid?: Money;
    balance?: Money;
    residual?: Money;
    overdue?: Money;
    overdue_amount?: Money;
    next_due_date?: string;
    oldest_overdue_date?: string;
  };
}

export interface CollectionPayment {
  id: number;
  date: string;
  amount: Money;
  reference: string;
  receipt_number: string;
  method: string;
  unit_id: number;
}

export interface CollectionDashboardRow {
  unit_id: number;
  unit_code: string;
  unit_name: string;
  due: Money;
  collected: Money;
  overdue: Money;
  collection_rate: number;
}

export interface PaymentRegistration {
  payment: Payment | null;
  invoice: InvoiceDetail;
}

export interface OrderInvoiceResult {
  invoices: InvoiceDetail[];
  order: OrderDetail;
}

export interface InventoryReportRow {
  site: SiteRef;
  total: number;
  available: number;
  reserved: number;
  sold: number;
  handed_over: number;
  value_by_currency: Money[];
}

export interface SalesReportData {
  rows: Array<{ key: number; label: string; count: number; value_by_currency: Money[] }>;
  meta: {
    date_from: string;
    date_to: string;
    group_by: string;
    count: number;
    value_by_currency: Money[];
  };
}

export interface OrderInput {
  partner_id: number;
  unit_id: number;
  payment_type: "full" | "down_payment";
  unit_price?: string | number | null;
  discount?: string | number | null;
  down_payment?: string | number | null;
  notes?: string;
  client_order_ref?: string;
  company_id?: number;
}

export interface InstallmentInput {
  total_price?: string | number | null;
  installment_count: number;
  first_date: string;
}
