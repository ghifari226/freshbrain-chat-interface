export const ENTRY_TYPES = ['definition', 'document', 'alias']
export const STATUS_COLOR = {
  production: 'success',
  staging: 'warning',
  request: 'default',
}
export const TRANSITION_BY_STATUS = {
  production: {
    labelKey: 'freshpedia.demoteToStagingAction',
    toStatus: 'staging',
    direction: 'down',
    colorClass: 'icon-button--warning',
  },
  staging: {
    labelKey: 'freshpedia.promoteToProductionAction',
    toStatus: 'production',
    direction: 'up',
    colorClass: 'icon-button--success',
  },
}

// Chip color for the Request tab's status badge, keyed by requestStatus —
// separate from STATUS_COLOR above (which is keyed by `status`, used on
// the Live tab). 'live' here means "frozen, permanently promoted", not the
// Live tab itself.
export const REQUEST_STATUS_COLOR = {
  draft: 'default',
  posted: 'info',
  live: 'success',
}

// The Draft<->Posted toggle, same shape as TRANSITION_BY_STATUS above but
// keyed by requestStatus and only ever offered while still status='request'
// (a promoted, requestStatus='live' entry has nothing to toggle — it's
// frozen). Distinct action from Promote (request_status permission vs
// is_maintainer).
export const REQUEST_STATUS_TRANSITION_BY_STATUS = {
  draft: {
    labelKey: 'freshpedia.postRequestAction',
    toRequestStatus: 'posted',
    colorClass: 'icon-button--edit',
  },
  posted: {
    labelKey: 'freshpedia.moveToDraftAction',
    toRequestStatus: 'draft',
  },
}
export const EMPTY_FRESHPEDIA_FORM = {
  title: '',
  type: 'definition',
  content: '',
  fileName: '',
  aliasTargetId: null,
  aliasPhrase: '',
}

export function isFreshpediaFormValid(form) {
  if (!form.title.trim()) return false
  if (form.type === 'definition') return Boolean(form.content.trim())
  if (form.type === 'document') return Boolean(form.fileName)
  return Boolean(form.aliasTargetId) && Boolean(form.aliasPhrase.trim())
}
