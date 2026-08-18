import { ALL_PERMISSIONS } from '@features/access-control'

function allExcept(excluded) {
  const excludedSet = new Set(excluded)
  return ALL_PERMISSIONS.filter((key) => !excludedSet.has(key))
}

function allWithPrefix(prefix) {
  return ALL_PERMISSIONS.filter((key) => key.startsWith(prefix + '.'))
}
export const PERMISSION_PRESETS = [
  {
    id: 'admin-hr',
    label: 'Admin HR',
    permissions: ['users.view', 'users.add', 'users.edit', 'users.delete'],
  },
  {
    id: 'admin-tech',
    label: 'Admin tech',
    permissions: allExcept([
      'users.add',
      'users.edit',
      'users.delete',
      'freshpedia.live_edit',
      'freshpedia.live_status',
      'freshpedia.request_add',
      'freshpedia.request_edit',
      'freshpedia.request_status',
      'tools.request_add',
      'tools.request_edit',
      'tools.request_status',
    ]),
  },
  {
    id: 'capability-all-requests',
    label: 'Capability all requests',
    permissions: [
      'freshpedia.live_view',
      'freshpedia.request_view',
      'freshpedia.request_add',
      'freshpedia.request_edit',
      'freshpedia.request_status',
      'tools.live_view',
      'tools.request_view',
      'tools.request_add',
      'tools.request_edit',
      'tools.request_status',
    ],
  },
  {
    id: 'capability-freshpedia',
    label: 'Capability Freshpedia',
    permissions: allWithPrefix('freshpedia'),
  },
  {
    id: 'capability-freshpedia-maintainer',
    label: 'Capability Freshpedia maintainer',
    permissions: ['freshpedia.live_view', 'freshpedia.live_edit', 'freshpedia.live_status'],
  },
  {
    id: 'capability-freshpedia-requestor',
    label: 'Capability Freshpedia requestor',
    permissions: [
      'freshpedia.live_view',
      'freshpedia.request_view',
      'freshpedia.request_add',
      'freshpedia.request_edit',
    ],
  },
  {
    id: 'capability-tester',
    label: 'Capability tester',
    permissions: ['freshpedia.live_view', 'tools.live_view', 'staging.test'],
  },
  {
    id: 'capability-tools-requestor',
    label: 'Capability tools requestor',
    permissions: allWithPrefix('tools'),
  },
  {
    id: 'no-access',
    label: 'No access',
    permissions: [],
  },
  {
    id: 'superadmin',
    label: 'Superadmin',
    permissions: [...ALL_PERMISSIONS],
  },
  {
    id: 'view-only-capability',
    label: 'View-only capability',
    permissions: ['freshpedia.live_view', 'tools.live_view'],
  },
  {
    id: 'view-only-user-roles',
    label: 'View-only user roles',
    permissions: ['roles.view', 'users.view'],
  },
]

function permissionSetsEqual(a, b) {
  if (a.length !== b.length) return false
  const bSet = new Set(b)
  return a.every((key) => bSet.has(key))
}
export function matchPresetForPermissions(flags) {
  const activeKeys = ALL_PERMISSIONS.filter((key) => Boolean(flags[key]))
  const match = PERMISSION_PRESETS.find((preset) => permissionSetsEqual(preset.permissions, activeKeys))
  return match?.id ?? 'custom'
}
export function flagsForPreset(presetId) {
  const preset = PERMISSION_PRESETS.find((p) => p.id === presetId)
  const permissionSet = new Set(preset?.permissions ?? [])
  return Object.fromEntries(ALL_PERMISSIONS.map((key) => [key, permissionSet.has(key)]))
}
