# MKUYU ERP — Operations workspace

A separate web UI for the CDL sales, finance, collections, CRM, catalog,
project/handover, department-head and management teams. It talks to Odoo through
the `mkuyu_erp_api` addon in `mkuyu-odoo/addons/mkuyu_erp_api`; Odoo remains the
backend and the IT-only place for users and roles.

## Stack

- Bun workspaces, React 19, Vite 5, TypeScript, Tailwind 4
- TanStack Query for server state
- React Router 6
- lucide icons
- `@mkuyu/api` — HTTP client, types, ERP endpoints, token store
- `@mkuyu/core` — auth/session, permissions, formatting
- `@mkuyu/sales` — query hooks and query keys (screens stay thin)

## Run locally

```bash
cd erp-frontend
bun install
bun run dev:sales        # http://localhost:5174
```

`apps/sales/.env.local` points at the deployed POC API:

```text
VITE_API_BASE_URL=https://mkuyu-operations-feat-sales-poc-40826152.dev.odoo.com/api/v1
```

For local Odoo use `http://localhost:8069/api/v1`. The `/odoo` web path is not part
of the API URL. You can also override it for one run:

```powershell
$env:VITE_API_BASE_URL='http://127.0.0.1:8069/api/v1'; bun run dev -- --port 5176
```

Sign in with any Odoo user in a supported role. Local demo accounts use the password
configured in that environment:

- Sales: `cdl_sales_agent@`, `cdl_sales_manager@`, `cdl_sales_director@`, `cdl_sales_admin@`
- Finance: `cdl_finance_head@`, `cdl_cashier@`
- Collections: `cdl_collection_officer@`, `cdl_collection_team_lead@`
- Project: `cdl_project_team@`
- Master data: `master_data_lead@`
- Executives: `ceo@`, `cfo@`
- Read-only: `group_financial_controller@`, `group_treasurer@`, `group_tax_manager@`,
  `fp_a_lead@`, `internal_audit_lead@`, `legal@`
- Department Head: `department_head@` (must be linked to a department in Odoo)

`it_lead@` is intentionally **not** an ERP user; IT works in Odoo only.

Other commands:

```bash
bun run typecheck
bun run build:sales
```

## Screens

| Route | Screen | Notes |
|---|---|---|
| `/login` | Sign in | Odoo staff login |
| `/no-access` | No ERP role | Explains the group requirement |
| `/dashboard` | Dashboard | Role-aware inventory, sales, finance and approval cards |
| `/inventory/units` | Units | Filters by site, building, status, type; paginated |
| `/inventory/units/:id` | Unit detail | Reserve, cancel, hand over, edit, archive by capability |
| `/inventory/units/new` | New unit | Master data and pricing |
| `/inventory/sites` | Sites | Master data / Director / Admin |
| `/inventory/buildings` | Buildings | Master data / Director / Admin |
| `/catalog` | Catalog | Products, subscription plans and sale taxes |
| `/buyers` | Buyers | Search by name, phone, email, national ID, customer ID |
| `/buyers/:id` | Buyer file | Contact, units, orders, statement PDF |
| `/orders` | Orders | Sales roles create; finance/management read |
| `/orders/new` | New quotation | Buyer, unit, full payment or down payment, approval hint |
| `/orders/:id` | Order detail | Confirm, approve, create invoice, installments, cancel |
| `/approvals` | Approvals | Director and Finance Head queues |
| `/crm` | CRM | Opportunity pipeline, stage moves, activities |
| `/invoices` | Invoices | Post, register payment, create credit note, CDL invoice PDF |
| `/invoices/:id` | Invoice detail | Post, register payment, credit note, PDF |
| `/credit-notes` | Credit notes | Create, approve, post |
| `/payments` | Payments | Register, receipt PDF |
| `/collections/dashboard` | Collection dashboard | Due / collected / overdue by unit |
| `/collections/clients` | Clients | Customer file, plans, schedule, payments, statement |
| `/collections/overdue` | Overdue | Collection worklist; log a follow-up |
| `/collections/payment-proofs` | Payment proofs | Review, await bank, reconcile, reject |
| `/collections/requests` | Client requests | Confirm, post, reject |
| `/department` | Department approvals | Department Head reads/approves/rejects assigned AP bills |
| `/finance` | Finance overview | Receivables, payables, cash, reconciliation, period close |
| `/finance/bills` | Vendor bills | Create, post, pay, cancel AP bills |
| `/finance/bills/:id` | Bill detail | Lines, post, register payment, cancel |
| `/finance/journals` | Journal entries | Create balanced manual entries, post, cancel |
| `/finance/journals/:id` | Entry detail | Journal items and posting state |
| `/finance/bank` | Bank reconciliation | Match statement lines to open invoices/bills |
| `/finance/cash` | Cash sessions | Open a drawer, close with counted cash and difference |
| `/finance/reports` | Financial reports | P&L, balance sheet, tax, trial balance, ledgers, aging |
| `/finance/config` | Finance configuration | Accounts, journals, taxes, assets, budgets, lock dates |
| `/reports` | Sales reports | Inventory and confirmed sales, CSV export |
| `/profile` | Profile | Role, companies, sign out |

Capabilities come from `GET /api/v1/erp/me`; the UI hides actions the user cannot
perform, but the API and Odoo enforce them again.

## Role summary

| Capability | Sales | Finance Head | Cashier | Collections | Project | Executives | Department Head | Read-only |
|---|---|---|---|---|---|---|---|---|
| Units / inventory | manage or read | read | no | read | read + handover | full | no | read |
| Orders | create/confirm | read + finance approve | no | read | read | full | no | read |
| CRM | manage (Director/Manager/Agent) | no | no | no | no | full | no | no |
| Catalog | read (Director/Manager/Agent/Admin) | read | no | no | read | full | no | read (Master Data manages products) |
| Customer invoices | read (Director/Manager/Agent) | create/post/pay | read + pay | read | read | full | no | read |
| Credit notes | Manager creates, Director approves | create/approve/post | no | read | read | full | no | read |
| AP bills / GL / tax / assets / budgets | no | full | no | no | no | full | read + approve dept bills | read/report |
| Bank reconciliation | no | match | no | no | no | full | no | read |
| Cash sessions | no | open/close | open/close | no | no | full | no | no |
| Collections | Director | read | no | write follow-ups | no | write | no | read |
| Reports | yes | yes | no | yes | yes | yes | no | yes |

Executives are CEO and CFO. Read-only covers Group Financial Controller, Group
Treasurer, Group Tax Manager, FP&A Lead, Internal Audit Lead and Legal, with the exact
screens controlled by their Odoo ACLs. IT Lead is Odoo-only.

## Finance flow

1. Sales creates a quotation; a discount above 8% or a price below list needs approval.
2. Sales Director and Finance Head approve in the ERP; sales confirms the order.
3. Finance creates and posts the customer invoice, then registers the payment.
4. Cashier can also register customer payments; only finance roles register vendor
   payments.
5. AP: finance creates a vendor bill, posts it, registers the payment and reconciles
   the bank line against the open bill/invoice.
6. Month end: finance clears draft documents, reconciles bank lines, closes cash
   sessions, records assets/budgets, reviews the financial reports and sets lock dates.
7. Department Head sees only AP bills assigned to their department and approves or
   rejects them; finance can see the approval state on the bill.

## Boundaries

- User and role administration stays in Odoo (IT only).
- No email sending. Only the existing CDL invoice, receipt and statement PDFs are
  downloadable; there is no quotation, agreement or handover PDF.
- Buyer, Storekeeper and Payables Clerk are not part of this UI.
- Bank reconciliation matches existing open items; it does not import bank feeds.
- Cash sessions record the drawer count against posted cash-journal entries; Odoo 19
  does not keep a separate cash-session record on the journal.
- The UI is a local build; deployment still requires publishing the Odoo branch,
  upgrading `mkuyu_erp_api` and restarting Odoo.sh.
