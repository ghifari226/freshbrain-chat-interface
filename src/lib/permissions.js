// Content-management capabilities (Freshpedia authorship, Tool Catalog
// staging/promotion) — separate from allowed_scopes, which gates chat-time
// data tool access. Granted per-user by Technology via the Users page, not
// derived from role: holding role 'Technology' does not itself grant any
// of these.

export const PERMISSIONS = [
  'freshpedia.view',
  'freshpedia.edit',
  'tool_catalog.view',
  'tool_catalog.edit',
]

export const PERMISSION_LABEL_KEYS = {
  'freshpedia.view': 'permissions.freshpediaView',
  'freshpedia.edit': 'permissions.freshpediaEdit',
  'tool_catalog.view': 'permissions.toolCatalogView',
  'tool_catalog.edit': 'permissions.toolCatalogEdit',
}

/**
 * True if allowedPermissions grants at least view-level access to a
 * feature — view or edit both count, since edit implies the ability to view.
 * @param {string[] | undefined} allowedPermissions
 * @param {'freshpedia' | 'tool_catalog'} feature
 */
export function canAccessFeature(allowedPermissions, feature) {
  const granted = allowedPermissions ?? []
  return granted.includes(`${feature}.view`) || granted.includes(`${feature}.edit`)
}
