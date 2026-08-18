export const ROLES = [
  'Superuser',
  'Technology',
]
export const ROLE_SCOPES = {
  Superuser: ['*'],
  Technology: ['wms', 'tms', 'dilema', 'odoo', 'dwh'],
}
export const ROLE_IDS = {
  Superuser: 'a3f1c2d4-0000-4a11-8b11-000000000001',
  Technology: 'a3f1c2d4-0000-4a11-8b11-000000000005',
}
export function roleNameForId(id) {
  return Object.entries(ROLE_IDS).find(([, roleId]) => roleId === id)?.[0]
}
export const LOCKED_ROLES = ['Superuser']
export function addRoleToCatalog(name) {
  const trimmed = name.trim()
  if (!trimmed || ROLES.includes(trimmed)) return
  ROLES.push(trimmed)
  ROLE_SCOPES[trimmed] = []
  ROLE_IDS[trimmed] = crypto.randomUUID()
}
export function renameRoleInCatalog(oldName, newName) {
  if (LOCKED_ROLES.includes(oldName)) {
    throw new Error('This role cannot be renamed')
  }
  const trimmed = newName.trim()
  if (!trimmed) return
  if (trimmed === oldName) return
  if (ROLES.includes(trimmed)) {
    throw new Error('A role with this name already exists')
  }
  const index = ROLES.indexOf(oldName)
  if (index === -1) return
  ROLES[index] = trimmed
  ROLE_SCOPES[trimmed] = ROLE_SCOPES[oldName] ?? []
  delete ROLE_SCOPES[oldName]
  ROLE_IDS[trimmed] = ROLE_IDS[oldName] ?? crypto.randomUUID()
  delete ROLE_IDS[oldName]
}
export function getRoleCatalog() {
  return ROLES.map((name) => ({
    id: ROLE_IDS[name],
    name,
    allowedScopes: ROLE_SCOPES[name] ?? [],
    locked: LOCKED_ROLES.includes(name),
  }))
}
