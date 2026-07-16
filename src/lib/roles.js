// Role metadata shared by auth (default scopes on login/register) and the
// /config/roles admin view. Single source of truth so the two don't drift.

export const ROLES = ['CEO', 'Ops Manager', 'Finance', 'Warehouse Staff', 'Technology']

export const DEFAULT_ROLE_SCOPES = {
  CEO: ['*'],
  'Ops Manager': ['wms', 'tms'],
  Finance: ['odoo'],
  'Warehouse Staff': ['wms'],
  // Technology manages access config itself, it doesn't query chat data.
  Technology: [],
}

export const ROLE_LABEL_KEYS = {
  CEO: 'auth.roleCeo',
  'Ops Manager': 'auth.roleOpsManager',
  Finance: 'auth.roleFinance',
  'Warehouse Staff': 'auth.roleWarehouseStaff',
  Technology: 'auth.roleTechnology',
}
