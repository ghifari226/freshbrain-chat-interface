import { describe, expect, it } from 'vitest'
import {
  TECHNOLOGY_LOCKED_PERMISSIONS,
  canAccessConfigSection,
  canAccessFreshpedia,
  canAccessToolCatalog,
  canAssignPermissions,
  canViewPermissions,
  canViewRoles,
  canViewUsers,
} from './permissions.js'

describe('permission gates', () => {
  it('denies missing permissions safely', () => {
    expect(canAccessConfigSection()).toBe(false)
    expect(canViewUsers({})).toBe(false)
    expect(canViewRoles({})).toBe(false)
    expect(canViewPermissions({})).toBe(false)
  })

  it('allows each configuration section through any relevant capability', () => {
    expect(canViewUsers({ allowed_permissions: ['users.edit'] })).toBe(true)
    expect(canViewUsers({ allowed_permissions: ['users.assign_permissions'] })).toBe(true)
    expect(canViewRoles({ allowed_permissions: ['roles.assign_scopes'] })).toBe(true)
    expect(canViewPermissions({ allowed_permissions: ['permissions.edit'] })).toBe(true)
    expect(canAccessConfigSection({ allowed_permissions: ['users.view'] })).toBe(true)
  })

  it('keeps permission assignment behind role, not a permission flag', () => {
    expect(canAssignPermissions({ role: 'Finance', allowed_permissions: ['users.edit'] })).toBe(false)
    expect(canAssignPermissions({ role: 'Superuser' })).toBe(true)
    expect(canAssignPermissions({ role: 'Technology' })).toBe(true)
  })

  it('locks users.assign_permissions and users.view specifically for Technology', () => {
    expect(TECHNOLOGY_LOCKED_PERMISSIONS).toEqual(['users.assign_permissions', 'users.view'])
  })

  it('gates Freshpedia access on request_view, Tool Catalog access on live_view', () => {
    expect(canAccessFreshpedia({ allowed_permissions: ['staging.test'] })).toBe(false)
    expect(canAccessToolCatalog({ allowed_permissions: ['staging.test'] })).toBe(false)
    expect(canAccessToolCatalog({ allowed_permissions: ['tools.request_view'] })).toBe(false)
    expect(canAccessFreshpedia({ allowed_permissions: ['freshpedia.request_view'] })).toBe(true)
    expect(canAccessToolCatalog({ allowed_permissions: ['tools.live_view'] })).toBe(true)
  })
})
