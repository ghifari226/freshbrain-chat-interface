// The catalog of assignable scopes, grouped by system. Currently a local
// mirror of freshbrain-agreement/scope-catalog.md. Data-fetching is isolated
// in getScopeCatalog() so swapping this for a live ai-engine query later
// doesn't require touching any callers — same pattern as lib/api.js.

// subScopeDescriptions are placeholder copy ("<system>.<sub> description")
// until real descriptions are written — see ScopesPage's per-chip
// description popover.
const SCOPE_CATALOG = [
  {
    system: 'wms',
    label: 'Warehouse Management System',
    subScopes: ['inventory', 'inbound', 'fulfillment'],
    subScopeDescriptions: {
      inventory: 'wms.inventory description',
      inbound: 'wms.inbound description',
      fulfillment: 'wms.fulfillment description',
    },
  },
  {
    system: 'tms',
    label: 'Transport Management System',
    subScopes: ['shipment'],
    subScopeDescriptions: {
      shipment: 'tms.shipment description',
    },
  },
  {
    system: 'dilema',
    label: 'Direct Sales Management',
    subScopes: ['orders', 'tenants'],
    subScopeDescriptions: {
      orders: 'dilema.orders description',
      tenants: 'dilema.tenants description',
    },
  },
  {
    system: 'odoo',
    label: 'Enterprise Resource Management',
    subScopes: ['revenue'],
    subScopeDescriptions: {
      revenue: 'odoo.revenue description',
    },
  },
  {
    system: 'dwh',
    label: 'FreshBrain Data Warehouse',
    subScopes: [],
    subScopeDescriptions: {},
  },
]

/**
 * @returns {Promise<{ system: string, label: string, subScopes: string[], subScopeDescriptions: Record<string, string> }[]>}
 */
export async function getScopeCatalog() {
  return SCOPE_CATALOG
}
