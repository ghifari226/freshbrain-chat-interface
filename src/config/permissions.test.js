import { describe, expect, it } from 'vitest'
import {
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
    expect(canViewRoles({ allowed_permissions: ['roles.assign_scopes'] })).toBe(true)
    expect(canViewPermissions({ allowed_permissions: ['permissions.edit'] })).toBe(true)
    expect(canAccessConfigSection({ allowed_permissions: ['users.view'] })).toBe(true)
  })

  it('keeps permission assignment behind its dedicated permission', () => {
    expect(canAssignPermissions({ allowed_permissions: ['users.edit'] })).toBe(false)
    expect(canAssignPermissions({ allowed_permissions: ['users.assign_permissions'] })).toBe(true)
  })

  it('gates Freshpedia/Tool Catalog access on .view only', () => {
    expect(canAccessFreshpedia({ allowed_permissions: ['staging.test'] })).toBe(false)
    expect(canAccessFreshpedia({ allowed_permissions: ['freshpedia.request'] })).toBe(false)
    expect(canAccessToolCatalog({ allowed_permissions: ['staging.test'] })).toBe(false)
    expect(canAccessToolCatalog({ allowed_permissions: ['tools.request'] })).toBe(false)
    expect(canAccessFreshpedia({ allowed_permissions: ['freshpedia.view'] })).toBe(true)
    expect(canAccessToolCatalog({ allowed_permissions: ['tools.view'] })).toBe(true)
  })
})
