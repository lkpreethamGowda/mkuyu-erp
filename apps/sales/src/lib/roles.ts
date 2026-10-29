export const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  cfo: "CFO",
  it_lead: "IT Lead",
  finance: "Finance Head",
  financial_controller: "Group Financial Controller",
  treasurer: "Group Treasurer",
  tax_manager: "Group Tax Manager",
  master_data: "Master-Data Lead",
  collection_lead: "Collection Team Lead",
  collection_officer: "Collection Officer",
  project_team: "Project Team",
  cashier: "Cashier",
  sales_director: "Sales Director",
  sales_manager: "Sales Manager",
  sales_agent: "Sales Agent",
  sales_admin: "Sales Admin",
  fp_a: "FP&A Lead",
  auditor: "Internal Audit Lead",
  legal: "Legal",
  department_head: "Department Head",
};

export function roleLabel(role?: string | null): string {
  return (role && ROLE_LABELS[role]) || "ERP user";
}
