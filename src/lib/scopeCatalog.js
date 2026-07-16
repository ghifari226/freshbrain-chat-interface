// The catalog of assignable scopes, grouped by system. Currently a local
// mirror of freshbrain-agreement/scope-catalog.md. Data-fetching is isolated
// in getScopeCatalog() so swapping this for a live ai-engine query later
// doesn't require touching any callers — same pattern as lib/api.js.

const SCOPE_CATALOG = [
  {
    system: 'wms',
    label: 'Warehouse Management System',
    subScopes: ['inventory', 'inbound', 'fulfillment'],
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
    label: 'Finance (Odoo)',
    subScopes: ['revenue'],
  },
  {
    system: 'settlement',
    label: 'Settlement',
    subScopes: ['creation', 'fulfillment', 'delivery', 'completion'],
  },
]

/**
 * @returns {Promise<{ system: string, label: string, subScopes: string[] }[]>}
 */
export async function getScopeCatalog() {
  return SCOPE_CATALOG
}
