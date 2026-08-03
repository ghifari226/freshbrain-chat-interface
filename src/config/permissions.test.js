import { describe, expect, it } from 'vitest'
import {
  canAccessConfigSection,
  canAccessFreshpedia,
  canAccessToolCatalog,
  canAssignPermissions,
  canPromote,
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

  it('keeps permission assignment behind role, not a permission flag', () => {
    expect(canAssignPermissions({ role: 'Finance', allowed_permissions: ['users.edit'] })).toBe(false)
    expect(canAssignPermissions({ role: 'Superadmin' })).toBe(true)
    expect(canAssignPermissions({ role: 'Technology' })).toBe(true)
  })

  it('gates Freshpedia/Tool Catalog access on live_view only', () => {
    expect(canAccessFreshpedia({ allowed_permissions: ['staging.test'] })).toBe(false)
    expect(canAccessFreshpedia({ allowed_permissions: ['freshpedia.request_view'] })).toBe(false)
    expect(canAccessToolCatalog({ allowed_permissions: ['staging.test'] })).toBe(false)
    expect(canAccessToolCatalog({ allowed_permissions: ['tools.request_view'] })).toBe(false)
    expect(canAccessFreshpedia({ allowed_permissions: ['freshpedia.live_view'] })).toBe(true)
    expect(canAccessToolCatalog({ allowed_permissions: ['tools.live_view'] })).toBe(true)
  })

  it('gates Promote on the is_maintainer boolean, never a permission', () => {
    expect(canPromote({ is_maintainer: false, allowed_permissions: ['freshpedia.live_change_status'] })).toBe(false)
    expect(canPromote({ is_maintainer: true, allowed_permissions: [] })).toBe(true)
    expect(canPromote(undefined)).toBe(false)
  })
})
