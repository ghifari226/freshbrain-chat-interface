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
export async function getScopeCatalog() {
  return SCOPE_CATALOG
}
