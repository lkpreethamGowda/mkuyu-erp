import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesApi } from "@mkuyu/api";
import type {
  InstallmentInput,
  LockDates,
  OrderInput,
  SalesPermission,
} from "@mkuyu/api";
import { queryKeys, type Filters } from "./queryKeys";

function useSalesInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.root });
}

export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => salesApi.dashboard(signal),
    enabled,
  });
}

export function useSites(enabled = true) {
  return useQuery({
    queryKey: queryKeys.sites,
    queryFn: ({ signal }) => salesApi.sites(signal),
    enabled,
  });
}

export function useBuildings(siteId?: number | string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.buildings(siteId),
    queryFn: ({ signal }) => salesApi.buildings(siteId, signal),
    enabled,
  });
}

export function useUnits(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.units(filters),
    queryFn: ({ signal }) => salesApi.units(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUnit(id?: number | string) {
  return useQuery({
    queryKey: queryKeys.unit(id ?? ""),
    queryFn: ({ signal }) => salesApi.unit(id as number | string, signal),
    enabled: Boolean(id),
  });
}

export function useBuyers(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.buyers(filters),
    queryFn: ({ signal }) => salesApi.buyers(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useBuyer(id?: number | string) {
  return useQuery({
    queryKey: queryKeys.buyer(id ?? ""),
    queryFn: ({ signal }) => salesApi.buyer(id as number | string, signal),
    enabled: Boolean(id),
  });
}

export function useOrders(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders(filters),
    queryFn: ({ signal }) => salesApi.orders(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useOrder(id?: number | string) {
  return useQuery({
    queryKey: queryKeys.order(id ?? ""),
    queryFn: ({ signal }) => salesApi.order(id as number | string, signal),
    enabled: Boolean(id),
  });
}

export function useApprovals(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.approvals,
    queryFn: ({ signal }) => salesApi.approvals(signal),
    enabled,
  });
}

export function useDepartmentSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.departmentSummary,
    queryFn: ({ signal }) => salesApi.departmentSummary(signal),
    enabled,
  });
}

export function useDepartmentBills(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.departmentBills(filters),
    queryFn: ({ signal }) => salesApi.departmentBills(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useApproveDepartmentBill() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.approveDepartmentBill, onSuccess: invalidate });
}

export function useRejectDepartmentBill() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; reason: string }) => salesApi.rejectDepartmentBill(variables.id, variables.reason),
    onSuccess: invalidate,
  });
}

export function useCatalogProducts(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.catalogProducts(filters),
    queryFn: ({ signal }) => salesApi.catalogProducts(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCatalogTaxes(enabled = true) {
  return useQuery({ queryKey: queryKeys.catalogTaxes, queryFn: ({ signal }) => salesApi.catalogTaxes(signal), enabled });
}

export function useCatalogPlans(enabled = true) {
  return useQuery({ queryKey: queryKeys.catalogPlans, queryFn: ({ signal }) => salesApi.catalogPlans(signal), enabled });
}

export function useCreateCatalogProduct() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => salesApi.createCatalogProduct(body), onSuccess: invalidate });
}

export function useUpdateCatalogProduct() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; body: Record<string, unknown> }) => salesApi.updateCatalogProduct(variables.id, variables.body),
    onSuccess: invalidate,
  });
}

export function useCreateCatalogPlan() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => salesApi.createCatalogPlan(body), onSuccess: invalidate });
}

export function useUpdateCatalogPlan() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; body: Record<string, unknown> }) => salesApi.updateCatalogPlan(variables.id, variables.body),
    onSuccess: invalidate,
  });
}

export function useCrmLeads(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.crmLeads(filters),
    queryFn: ({ signal }) => salesApi.crmLeads(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCrmMeta() {
  return useQuery({ queryKey: queryKeys.crmMeta, queryFn: ({ signal }) => salesApi.crmMeta(signal), staleTime: 5 * 60 * 1000 });
}

export function useCrmActivities(leadId?: number | string) {
  return useQuery({
    queryKey: queryKeys.crmActivities(leadId ?? ""),
    queryFn: ({ signal }) => salesApi.crmActivities(Number(leadId), signal),
    enabled: Boolean(leadId),
  });
}

export function useCreateCrmLead() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => salesApi.createCrmLead(body), onSuccess: invalidate });
}

export function useUpdateCrmLead() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; body: Record<string, unknown> }) => salesApi.updateCrmLead(variables.id, variables.body),
    onSuccess: invalidate,
  });
}

export function useMoveCrmLead() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; stageId: number }) => salesApi.moveCrmLeadStage(variables.id, variables.stageId),
    onSuccess: invalidate,
  });
}

export function useCreateCrmActivity() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { leadId: number; body: { summary: string; date_deadline: string; user_id?: number } }) =>
      salesApi.createCrmActivity(variables.leadId, variables.body),
    onSuccess: invalidate,
  });
}

export function useProducts(search = "") {
  return useQuery({
    queryKey: queryKeys.products(search),
    queryFn: ({ signal }) => salesApi.products(search || undefined, signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvoices(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invoices(filters),
    queryFn: ({ signal }) => salesApi.invoices(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useInvoice(id?: number | string) {
  return useQuery({
    queryKey: queryKeys.invoice(id ?? ""),
    queryFn: ({ signal }) => salesApi.invoice(id as number | string, signal),
    enabled: Boolean(id),
  });
}

export function useCreditNotes(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.creditNotes(filters),
    queryFn: ({ signal }) => salesApi.creditNotes(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCreditNote(id?: number | string) {
  return useQuery({
    queryKey: queryKeys.creditNote(id ?? ""),
    queryFn: ({ signal }) => salesApi.creditNote(id as number | string, signal),
    enabled: Boolean(id),
  });
}

export function usePayments(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments(filters),
    queryFn: ({ signal }) => salesApi.payments(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useInstallmentPreview(
  orderId: number | undefined,
  query: { total_price?: string | number; installment_count: number; first_date?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ["sales", "installment-preview", orderId, query],
    queryFn: () => salesApi.installmentPreview(orderId as number, query),
    enabled: Boolean(orderId) && enabled,
  });
}

export function useInventoryReport(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventoryReport,
    queryFn: ({ signal }) => salesApi.reportInventory(signal),
    enabled,
  });
}

export function useSalesReport(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.salesReport(filters),
    queryFn: ({ signal }) => salesApi.reportSales(filters, signal),
    enabled,
  });
}

// ------------------------------------------------------------------ mutations

export function useCreateUnit() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.createUnit, onSuccess: invalidate });
}

export function useUpdateUnit() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; body: Record<string, unknown> }) => salesApi.updateUnit(variables.id, variables.body),
    onSuccess: invalidate,
  });
}

export function useArchiveUnit() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.archiveUnit, onSuccess: invalidate });
}

export function useReserveUnit() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { unitId: number; buyerId: number }) => salesApi.reserveUnit(variables.unitId, variables.buyerId),
    onSuccess: invalidate,
  });
}

export function useCancelReservation() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.cancelReservation, onSuccess: invalidate });
}

export function useHandoverUnit() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.handoverUnit, onSuccess: invalidate });
}

export function useCreateSite() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.createSite, onSuccess: invalidate });
}

export function useUpdateSite() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; body: Record<string, unknown> }) => salesApi.updateSite(variables.id, variables.body),
    onSuccess: invalidate,
  });
}

export function useArchiveSite() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.archiveSite, onSuccess: invalidate });
}

export function useCreateBuilding() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.createBuilding, onSuccess: invalidate });
}

export function useUpdateBuilding() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; body: Record<string, unknown> }) => salesApi.updateBuilding(variables.id, variables.body),
    onSuccess: invalidate,
  });
}

export function useArchiveBuilding() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.archiveBuilding, onSuccess: invalidate });
}

export function useCreateBuyer() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.createBuyer, onSuccess: invalidate });
}

export function useUpdateBuyer() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; body: Record<string, unknown> }) => salesApi.updateBuyer(variables.id, variables.body),
    onSuccess: invalidate,
  });
}

export function useArchiveBuyer() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.archiveBuyer, onSuccess: invalidate });
}

export function useCreateOrder() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (body: OrderInput) => salesApi.createOrder(body), onSuccess: invalidate });
}

export function useUpdateOrder() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; body: Partial<OrderInput> }) => salesApi.updateOrder(variables.id, variables.body),
    onSuccess: invalidate,
  });
}

export function useConfirmOrder() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.confirmOrder, onSuccess: invalidate });
}

export function useCancelOrder() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.cancelOrder, onSuccess: invalidate });
}

export function useApproveOrder() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.approveOrder, onSuccess: invalidate });
}

export function useApproveOrderFinance() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.approveOrderFinance, onSuccess: invalidate });
}

export function useCreateOrderInvoice() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.createOrderInvoice, onSuccess: invalidate });
}

export function useCreateInstallments() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { orderId: number; body: InstallmentInput }) =>
      salesApi.createInstallments(variables.orderId, variables.body),
    onSuccess: invalidate,
  });
}

export function useCreateCreditNote() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { invoiceId: number; reason?: string; date?: string }) =>
      salesApi.createCreditNote(variables.invoiceId, { reason: variables.reason, date: variables.date }),
    onSuccess: invalidate,
  });
}

export function useApproveCreditNote() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.approveCreditNote, onSuccess: invalidate });
}

export function useApproveCreditNoteFinance() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.approveCreditNoteFinance, onSuccess: invalidate });
}

export function usePostCreditNote() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.postCreditNote, onSuccess: invalidate });
}

export function usePostInvoice() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: salesApi.postInvoice, onSuccess: invalidate });
}

export function useRegisterPayment() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: {
      invoiceId: number;
      body: { amount?: string | number; date?: string; reference?: string; journal_id?: number; payment_method_line_id?: number };
    }) => salesApi.registerPayment(variables.invoiceId, variables.body),
    onSuccess: invalidate,
  });
}

// --------------------------------------------------------------- collections

export function useClients(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.clients(filters),
    queryFn: ({ signal }) => salesApi.clients(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useClient(id?: number | string) {
  return useQuery({
    queryKey: queryKeys.client(id ?? ""),
    queryFn: ({ signal }) => salesApi.client(id as number | string, signal),
    enabled: Boolean(id),
  });
}

export function usePlans(clientId?: number | string) {
  return useQuery({
    queryKey: queryKeys.plans(clientId ?? ""),
    queryFn: ({ signal }) => salesApi.plans(clientId as number | string, signal),
    enabled: Boolean(clientId),
  });
}

export function useSchedule(clientId?: number | string, planId?: number | string) {
  return useQuery({
    queryKey: queryKeys.schedule(clientId ?? "", planId ?? ""),
    queryFn: ({ signal }) => salesApi.schedule(clientId as number | string, planId as number | string, signal),
    enabled: Boolean(clientId && planId),
  });
}

export function useClientPayments(clientId?: number | string, unitId?: number | string) {
  return useQuery({
    queryKey: queryKeys.clientPayments(clientId ?? "", unitId),
    queryFn: ({ signal }) => salesApi.clientPayments(clientId as number | string, unitId, signal),
    enabled: Boolean(clientId),
  });
}

export function useCollectionsDashboard(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.collectionsDashboard(filters),
    queryFn: ({ signal }) => salesApi.collectionsDashboard(filters, signal),
    enabled,
  });
}

export function useOverdue(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.overdue(filters),
    queryFn: ({ signal }) => salesApi.overdue(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useFollowups(clientId?: number | string, unitId?: number | string) {
  return useQuery({
    queryKey: queryKeys.followups(clientId ?? "", unitId),
    queryFn: ({ signal }) => salesApi.followups(clientId as number | string, unitId, signal),
    enabled: Boolean(clientId),
  });
}

export function useCreateFollowup() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: {
      clientId: number;
      body: {
        unit_id: number;
        channel: string;
        note: string;
        promise_amount?: string | number | null;
        promise_to_pay_date?: string | null;
        next_followup_date?: string | null;
      };
    }) => salesApi.createFollowup(variables.clientId, variables.body),
    onSuccess: invalidate,
  });
}

export function usePaymentProofs(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.paymentProofs(filters),
    queryFn: ({ signal }) => salesApi.paymentProofs(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePaymentProofAction() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { proofId: number; action: string; reason?: string }) =>
      salesApi.paymentProofAction(variables.proofId, variables.action, variables.reason),
    onSuccess: invalidate,
  });
}

export function useClientRequests(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.clientRequests(filters),
    queryFn: ({ signal }) => salesApi.clientRequests(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useClientRequestAction() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { requestId: number; action: string }) =>
      salesApi.clientRequestAction(variables.requestId, variables.action),
    onSuccess: invalidate,
  });
}

export function useFinanceOverview(enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeOverview,
    queryFn: ({ signal }) => salesApi.financeOverview(signal),
    enabled,
  });
}

export function useFinanceBills(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeBills(filters),
    queryFn: ({ signal }) => salesApi.financeBills(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useFinanceBill(id?: number | string) {
  return useQuery({
    queryKey: queryKeys.financeBill(id ?? ""),
    queryFn: ({ signal }) => salesApi.financeBill(id as number | string, signal),
    enabled: Boolean(id),
  });
}

export function useFinanceBillMeta(enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeBillMeta,
    queryFn: ({ signal }) => salesApi.financeBillMeta(signal),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useCreateFinanceBill() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => salesApi.createFinanceBill(body), onSuccess: invalidate });
}

export function usePostFinanceBill() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (id: number) => salesApi.postFinanceBill(id), onSuccess: invalidate });
}

export function useCancelFinanceBill() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (id: number) => salesApi.cancelFinanceBill(id), onSuccess: invalidate });
}

export function usePayFinanceBill() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; body: { amount?: number | string; date?: string; reference?: string; journal_id?: number } }) =>
      salesApi.payFinanceBill(variables.id, variables.body),
    onSuccess: invalidate,
  });
}

export function useJournalEntries(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.journalEntries(filters),
    queryFn: ({ signal }) => salesApi.journalEntries(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useJournalEntry(id?: number | string) {
  return useQuery({
    queryKey: queryKeys.journalEntry(id ?? ""),
    queryFn: ({ signal }) => salesApi.journalEntry(id as number | string, signal),
    enabled: Boolean(id),
  });
}

export function useJournalEntryMeta(enabled = true) {
  return useQuery({
    queryKey: queryKeys.journalEntryMeta,
    queryFn: ({ signal }) => salesApi.journalEntryMeta(signal),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useCreateJournalEntry() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => salesApi.createJournalEntry(body), onSuccess: invalidate });
}

export function usePostJournalEntry() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (id: number) => salesApi.postJournalEntry(id), onSuccess: invalidate });
}

export function useCancelJournalEntry() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (id: number) => salesApi.cancelJournalEntry(id), onSuccess: invalidate });
}

export function useBankReconciliation(enabled = true) {
  return useQuery({
    queryKey: queryKeys.bankReconciliation,
    queryFn: ({ signal }) => salesApi.bankReconciliation(signal),
    enabled,
  });
}

export function useBankReconciliationLines(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.bankReconciliationLines(filters),
    queryFn: ({ signal }) => salesApi.bankReconciliationLines(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useBankCandidates(lineId?: number | string, search = "") {
  return useQuery({
    queryKey: queryKeys.bankCandidates(lineId ?? "", search),
    queryFn: ({ signal }) => salesApi.bankReconciliationCandidates(lineId as number | string, search ? { search } : undefined, signal),
    enabled: Boolean(lineId),
  });
}

export function useMatchBankLine() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { lineId: number; moveLineIds: number[] }) =>
      salesApi.matchBankLine(variables.lineId, variables.moveLineIds),
    onSuccess: invalidate,
  });
}

export function useCashSessions(filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cashSessions(filters),
    queryFn: ({ signal }) => salesApi.cashSessions(filters, signal),
    enabled,
  });
}

export function useOpenCashSession() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (body: { journal_id: number; date?: string; opening_balance?: number | string; note?: string }) =>
      salesApi.openCashSession(body),
    onSuccess: invalidate,
  });
}

export function useCloseCashSession() {
  const invalidate = useSalesInvalidate();
  return useMutation({
    mutationFn: (variables: { id: number; body: { counted_balance: number | string; note?: string } }) =>
      salesApi.closeCashSession(variables.id, variables.body),
    onSuccess: invalidate,
  });
}

export function useFinanceConfig(enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeConfig,
    queryFn: ({ signal }) => salesApi.financeConfig(signal),
    enabled,
  });
}

export function useFinanceAssets(enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeAssets,
    queryFn: ({ signal }) => salesApi.financeAssets(signal),
    enabled,
  });
}

export function useFinanceBudgets(enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeBudgets,
    queryFn: ({ signal }) => salesApi.financeBudgets(signal),
    enabled,
  });
}

export function useFinanceAssetMeta(enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeAssetMeta,
    queryFn: ({ signal }) => salesApi.financeAssetMeta(signal),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useCreateFinanceAsset() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => salesApi.createFinanceAsset(body), onSuccess: invalidate });
}

export function useValidateFinanceAsset() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (id: number) => salesApi.validateFinanceAsset(id), onSuccess: invalidate });
}

export function useFinanceBudgetMeta(enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeBudgetMeta,
    queryFn: ({ signal }) => salesApi.financeBudgetMeta(signal),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useCreateFinanceBudget() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => salesApi.createFinanceBudget(body), onSuccess: invalidate });
}

export function useConfirmFinanceBudget() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (id: number) => salesApi.confirmFinanceBudget(id), onSuccess: invalidate });
}

export function useFinanceLockDates(enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeLockDates,
    queryFn: ({ signal }) => salesApi.financeLockDates(signal),
    enabled,
  });
}

export function useSetFinanceLockDates() {
  const invalidate = useSalesInvalidate();
  return useMutation({ mutationFn: (body: Partial<LockDates>) => salesApi.setFinanceLockDates(body), onSuccess: invalidate });
}

export function useFinanceReports(enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeReports,
    queryFn: ({ signal }) => salesApi.financeReports(signal),
    staleTime: 10 * 60 * 1000,
    enabled,
  });
}

export function useFinanceReport(code: string, filters: Filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.financeReport(code, filters),
    queryFn: ({ signal }) => salesApi.financeReport(code, filters, signal),
    enabled: Boolean(code) && enabled,
  });
}

/** Convenience for route guards that need a capability name. */
export type Permission = SalesPermission;
