// Role metadata shared by auth (default scopes on login/register) and the
// /config/roles admin view. Single source of truth so the two don't drift.

export const ROLES = ['CEO', 'Ops Manager', 'Finance', 'Warehouse Staff', 'Technology', 'Human Resource']

// The sole source for a role's allowed_scopes — not a per-user-overridable
// default. There is no allowed_scopes column on users at all; every user's
// effective scopes are resolved by looking up their role here.
export const ROLE_SCOPES = {
  CEO: ['*'],
  'Ops Manager': ['wms', 'tms'],
  Finance: ['odoo'],
  'Warehouse Staff': ['wms.inventory'],
  // Explicit list (not '*', which stays CEO-exclusive) so Technology can
  // query data cross-system for support/debugging without wildcarding.
  Technology: ['wms', 'tms', 'dilema', 'odoo', 'dwh'],
  // Human Resource manages the user directory, it doesn't query chat data.
  'Human Resource': [],
}

export const ROLE_LABEL_KEYS = {
  CEO: 'auth.roleCeo',
  'Ops Manager': 'auth.roleOpsManager',
  Finance: 'auth.roleFinance',
  'Warehouse Staff': 'auth.roleWarehouseStaff',
  Technology: 'auth.roleTechnology',
  'Human Resource': 'auth.roleHumanResource',
  // Job title in MOCK_USERS that differs from its scope bucket — not among
  // the assignable ROLES, but UsersPage looks it up directly.
  'Client Service Management': 'auth.roleClientServiceManagement',
}
