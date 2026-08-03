// Permission bundles for the Shield dialog's preset dropdown (2026-08-03).
// Picking a preset sets a user's permissions to exactly that bundle;
// hand-toggling a checkbox away from a bundle falls back to "Custom" (see
// matchPresetForPermissions below) — Custom is never itself a selectable
// preset, just what's shown when nothing else matches. Plain string labels,
// not i18n keys, same convention as roles.js's ROLES — these are role-title
// shaped, not prose.
import { ALL_PERMISSIONS } from './permissions.js'

function allExcept(excluded) {
  const excludedSet = new Set(excluded)
  return ALL_PERMISSIONS.filter((key) => !excludedSet.has(key))
}

export const PERMISSION_PRESETS = [
  {
    id: 'admin-hr',
    label: 'Admin HR',
    permissions: ['users.view', 'users.add', 'users.edit', 'users.delete'],
  },
  {
    id: 'admin-tech',
    label: 'Admin Tech',
    // Everything except user CRUD (Admin HR's job) and the day-to-day
    // content-editing permissions (Requestor's job) — system/infra
    // oversight and read access to everything, not hands-on content work.
    permissions: allExcept([
      'users.add',
      'users.edit',
      'users.delete',
      'freshpedia.live_edit',
      'freshpedia.live_change_status',
      'freshpedia.request_add',
      'freshpedia.request_edit',
      'freshpedia.request_change_status',
      'tools.request_add',
      'tools.request_edit',
      'tools.request_change_status',
    ]),
  },
  {
    id: 'requestor',
    label: 'Requestor',
    permissions: [
      'freshpedia.live_view',
      'freshpedia.request_view',
      'freshpedia.request_add',
      'freshpedia.request_edit',
      'freshpedia.request_change_status',
      'tools.live_view',
      'tools.request_view',
      'tools.request_add',
      'tools.request_edit',
      'tools.request_change_status',
    ],
  },
  {
    id: 'superadmin',
    label: 'Superadmin',
    permissions: [...ALL_PERMISSIONS],
  },
  {
    id: 'tester',
    label: 'Tester',
    permissions: ['freshpedia.live_view', 'tools.live_view', 'staging.test'],
  },
  {
    id: 'view-only-capability',
    label: 'View-only Capability',
    permissions: ['freshpedia.live_view', 'tools.live_view'],
  },
  {
    id: 'view-only-system',
    label: 'View-only System',
    permissions: ['roles.view', 'users.view'],
  },
]

function permissionSetsEqual(a, b) {
  if (a.length !== b.length) return false
  const bSet = new Set(b)
  return a.every((key) => bSet.has(key))
}

/**
 * @param {Record<string, boolean>} flags - the Shield dialog's checkbox flags
 * @returns {string} a PERMISSION_PRESETS id, or 'custom' if nothing matches
 */
export function matchPresetForPermissions(flags) {
  const activeKeys = ALL_PERMISSIONS.filter((key) => Boolean(flags[key]))
  const match = PERMISSION_PRESETS.find((preset) => permissionSetsEqual(preset.permissions, activeKeys))
  return match?.id ?? 'custom'
}

/**
 * @param {string} presetId
 * @returns {Record<string, boolean>}
 */
export function flagsForPreset(presetId) {
  const preset = PERMISSION_PRESETS.find((p) => p.id === presetId)
  const permissionSet = new Set(preset?.permissions ?? [])
  return Object.fromEntries(ALL_PERMISSIONS.map((key) => [key, permissionSet.has(key)]))
}
