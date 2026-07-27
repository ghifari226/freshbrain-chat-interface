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
    expect(canViewUsers({ 'user.edit': true })).toBe(true)
    expect(canViewRoles({ 'role_scope.assign_scopes': true })).toBe(true)
    expect(canViewPermissions({ 'permission.edit': true })).toBe(true)
    expect(canAccessConfigSection({ 'user.view': true })).toBe(true)
  })

  it('keeps permission assignment behind its dedicated permission', () => {
    expect(canAssignPermissions({ 'user.edit': true })).toBe(false)
    expect(canAssignPermissions({ 'user.assign_permissions': true })).toBe(true)
  })

  it('allows staging access to both managed chat catalogs', () => {
    const stagingSession = { 'staging.test': true }
    expect(canAccessFreshpedia(stagingSession)).toBe(true)
    expect(canAccessToolCatalog(stagingSession)).toBe(true)
  })
})
