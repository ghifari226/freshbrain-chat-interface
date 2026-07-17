// Role metadata shared by auth (default scopes on login/register) and the
// /config/roles admin view. Single source of truth so the two don't drift.

export const ROLES = ['CEO', 'Ops Manager', 'Finance', 'Warehouse Staff', 'Technology', 'HR']

export const DEFAULT_ROLE_SCOPES = {
  CEO: ['*'],
  'Ops Manager': ['wms', 'tms'],
  Finance: ['odoo'],
  'Warehouse Staff': ['wms.inventory'],
  // Technology manages access config itself, it doesn't query chat data.
  Technology: [],
  // HR manages the user directory, it doesn't query chat data either.
  HR: [],
}

export const ROLE_LABEL_KEYS = {
  CEO: 'auth.roleCeo',
  'Ops Manager': 'auth.roleOpsManager',
  Finance: 'auth.roleFinance',
  'Warehouse Staff': 'auth.roleWarehouseStaff',
  Technology: 'auth.roleTechnology',
  HR: 'auth.roleHr',
  // Job titles in MOCK_USERS that differ from their scope bucket — not
  // among the assignable ROLES, but UsersPage looks these up directly.
  'Client Service Management': 'auth.roleClientServiceManagement',
  'Human Resource': 'auth.roleHumanResource',
}
