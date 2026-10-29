import { createBrowserRouter } from "react-router-dom";
import { LandingRedirect, RequireAuth, RequirePermission } from "./Guards";
import { SalesLayout } from "../layouts/SalesLayout";

import { LoginPage } from "../features/auth/LoginPage";
import { NoAccessPage } from "../features/auth/NoAccessPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { UnitsPage } from "../features/inventory/UnitsPage";
import { UnitDetailPage } from "../features/inventory/UnitDetailPage";
import { UnitFormPage } from "../features/inventory/UnitFormPage";
import { SitesPage } from "../features/inventory/SitesPage";
import { BuildingsPage } from "../features/inventory/BuildingsPage";
import { BuyersPage } from "../features/buyers/BuyersPage";
import { BuyerDetailPage } from "../features/buyers/BuyerDetailPage";
import { BuyerFormPage } from "../features/buyers/BuyerFormPage";
import { CatalogPage } from "../features/catalog/CatalogPage";
import { DepartmentPage } from "../features/department/DepartmentPage";
import { BankReconciliationPage } from "../features/finance/BankReconciliationPage";
import { BillDetailPage } from "../features/finance/BillDetailPage";
import { BillsPage } from "../features/finance/BillsPage";
import { CashSessionsPage } from "../features/finance/CashSessionsPage";
import { FinanceConfigPage } from "../features/finance/FinanceConfigPage";
import { FinanceOverviewPage } from "../features/finance/FinanceOverviewPage";
import { FinanceReportsPage } from "../features/finance/FinanceReportsPage";
import { JournalEntriesPage } from "../features/finance/JournalEntriesPage";
import { JournalEntryDetailPage } from "../features/finance/JournalEntryDetailPage";
import { CrmPage } from "../features/crm/CrmPage";
import { OrdersPage } from "../features/orders/OrdersPage";
import { OrderCreatePage } from "../features/orders/OrderCreatePage";
import { OrderDetailPage } from "../features/orders/OrderDetailPage";
import { ApprovalsPage } from "../features/approvals/ApprovalsPage";
import { InvoicesPage } from "../features/billing/InvoicesPage";
import { InvoiceDetailPage } from "../features/billing/InvoiceDetailPage";
import { CreditNotesPage } from "../features/billing/CreditNotesPage";
import { CreditNoteDetailPage } from "../features/billing/CreditNoteDetailPage";
import { PaymentsPage } from "../features/billing/PaymentsPage";
import { CollectionDashboardPage } from "../features/collections/CollectionDashboardPage";
import { CollectionClientsPage } from "../features/collections/CollectionClientsPage";
import { CollectionClientPage } from "../features/collections/CollectionClientPage";
import { OverduePage } from "../features/collections/OverduePage";
import { PaymentProofsPage } from "../features/collections/PaymentProofsPage";
import { ClientRequestsPage } from "../features/collections/ClientRequestsPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { NotFoundPage } from "../features/NotFoundPage";
import { ErrorPage } from "../features/ErrorPage";

export const router = createBrowserRouter([
  { path: "/", element: <LandingRedirect />, errorElement: <ErrorPage /> },
  { path: "/login", element: <LoginPage />, errorElement: <ErrorPage /> },
  { path: "/no-access", element: <NoAccessPage />, errorElement: <ErrorPage /> },
  {
    element: <RequireAuth />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <SalesLayout />,
        errorElement: <ErrorPage />,
        children: [
          { path: "/dashboard", element: <RequirePermission permission="view_dashboard"><DashboardPage /></RequirePermission> },
          { path: "/inventory/units", element: <RequirePermission permission="view_units"><UnitsPage /></RequirePermission> },
          { path: "/inventory/units/new", element: <RequirePermission permission="manage_units"><UnitFormPage /></RequirePermission> },
          { path: "/inventory/units/:unitId", element: <RequirePermission permission="view_units"><UnitDetailPage /></RequirePermission> },
          { path: "/inventory/units/:unitId/edit", element: <RequirePermission permission="manage_units"><UnitFormPage /></RequirePermission> },
          { path: "/inventory/sites", element: <RequirePermission permission="view_units"><SitesPage /></RequirePermission> },
          { path: "/inventory/buildings", element: <RequirePermission permission="view_units"><BuildingsPage /></RequirePermission> },
          { path: "/catalog", element: <RequirePermission permission="view_catalog"><CatalogPage /></RequirePermission> },
          { path: "/department", element: <RequirePermission permission="view_department"><DepartmentPage /></RequirePermission> },
          { path: "/buyers", element: <RequirePermission permission="view_buyers"><BuyersPage /></RequirePermission> },
          { path: "/buyers/new", element: <RequirePermission permission="manage_buyers"><BuyerFormPage /></RequirePermission> },
          { path: "/buyers/:buyerId", element: <RequirePermission permission="view_buyers"><BuyerDetailPage /></RequirePermission> },
          { path: "/buyers/:buyerId/edit", element: <RequirePermission permission="manage_buyers"><BuyerFormPage /></RequirePermission> },
          { path: "/crm", element: <RequirePermission permission="view_crm"><CrmPage /></RequirePermission> },
          { path: "/orders", element: <RequirePermission permission="view_orders"><OrdersPage /></RequirePermission> },
          { path: "/orders/new", element: <RequirePermission permission="create_orders"><OrderCreatePage /></RequirePermission> },
          { path: "/orders/:orderId", element: <RequirePermission permission="view_orders"><OrderDetailPage /></RequirePermission> },
          { path: "/orders/:orderId/edit", element: <RequirePermission permission="edit_orders"><OrderCreatePage /></RequirePermission> },
          { path: "/approvals", element: <RequirePermission permission="view_approvals"><ApprovalsPage /></RequirePermission> },
          { path: "/invoices", element: <RequirePermission permission="view_invoices"><InvoicesPage /></RequirePermission> },
          { path: "/invoices/:invoiceId", element: <RequirePermission permission="view_invoices"><InvoiceDetailPage /></RequirePermission> },
          { path: "/credit-notes", element: <RequirePermission permission="view_invoices"><CreditNotesPage /></RequirePermission> },
          { path: "/credit-notes/:creditNoteId", element: <RequirePermission permission="view_invoices"><CreditNoteDetailPage /></RequirePermission> },
          { path: "/payments", element: <RequirePermission permission="view_payments"><PaymentsPage /></RequirePermission> },
          { path: "/finance", element: <RequirePermission permission="view_finance"><FinanceOverviewPage /></RequirePermission> },
          { path: "/finance/bills", element: <RequirePermission permission="view_finance"><BillsPage /></RequirePermission> },
          { path: "/finance/bills/:billId", element: <RequirePermission permission="view_finance"><BillDetailPage /></RequirePermission> },
          { path: "/finance/journals", element: <RequirePermission permission="view_finance"><JournalEntriesPage /></RequirePermission> },
          { path: "/finance/journals/:entryId", element: <RequirePermission permission="view_finance"><JournalEntryDetailPage /></RequirePermission> },
          { path: "/finance/bank", element: <RequirePermission permission="view_finance"><BankReconciliationPage /></RequirePermission> },
          { path: "/finance/cash", element: <RequirePermission permission="view_cash"><CashSessionsPage /></RequirePermission> },
          { path: "/finance/reports", element: <RequirePermission permission="view_finance_reports"><FinanceReportsPage /></RequirePermission> },
          { path: "/finance/config", element: <RequirePermission permission="view_finance"><FinanceConfigPage /></RequirePermission> },
          { path: "/collections/dashboard", element: <RequirePermission permission="view_collections"><CollectionDashboardPage /></RequirePermission> },
          { path: "/collections/clients", element: <RequirePermission permission="view_collections"><CollectionClientsPage /></RequirePermission> },
          { path: "/collections/clients/:clientId", element: <RequirePermission permission="view_collections"><CollectionClientPage /></RequirePermission> },
          { path: "/collections/overdue", element: <RequirePermission permission="view_collections"><OverduePage /></RequirePermission> },
          { path: "/collections/payment-proofs", element: <RequirePermission permission="view_payment_proofs"><PaymentProofsPage /></RequirePermission> },
          { path: "/collections/requests", element: <RequirePermission permission="view_client_requests"><ClientRequestsPage /></RequirePermission> },
          { path: "/reports", element: <RequirePermission permission="view_reports"><ReportsPage /></RequirePermission> },
          { path: "/profile", element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage />, errorElement: <ErrorPage /> },
]);
