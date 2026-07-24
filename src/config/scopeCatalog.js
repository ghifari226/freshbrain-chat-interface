// The catalog of assignable scopes, grouped by system. Currently a local
// mirror of freshbrain-agreement/scope-catalog.md. Data-fetching is isolated
// in getScopeCatalog() so swapping this for a live ai-engine query later
// doesn't require touching any callers — same pattern as services/apiClient.js.
// Consumed by RolesPage (scope-assignment checkboxes) and ToolCatalogPage
// (system column + system filter chips) — there's no standalone Scope
// Catalog admin page anymore, that concept lives in Tool Catalog now.
const SCOPE_CATALOG = [
  {
    system: 'wms',
    label: 'Warehouse Management System',
    subScopes: ['inbound', 'inventory', 'fulfillment'],
  },
  {
    system: 'tms',
    label: 'Transport Management System',
    subScopes: ['shipment'],
  },
  {
    system: 'dilema',
    label: 'Direct Sales Management',
    subScopes: ['orders', 'tenants'],
  },
  {
    system: 'odoo',
    label: 'Enterprise Resource Management',
    subScopes: ['revenue'],
  },
  {
    system: 'dwh',
    label: 'FreshBrain Data Warehouse',
    subScopes: [],
  },
]

/**
 * @returns {Promise<{ system: string, label: string, subScopes: string[] }[]>}
 */
export async function getScopeCatalog() {
  return SCOPE_CATALOG
}
