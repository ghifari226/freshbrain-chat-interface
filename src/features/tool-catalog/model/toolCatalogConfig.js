export const LIVE_STATUSES = ['production', 'staging']
export const REQUEST_STATUSES = ['live', 'posted', 'draft']

export const TOOL_STATUS_COLOR = {
  production: 'success',
  staging: 'warning',
}
export const REQUEST_STATUS_COLOR = {
  draft: 'default',
  posted: 'info',
  live: 'success',
}
export const REQUEST_STATUS_TRANSITION_BY_STATUS = {
  draft: {
    labelKey: 'toolCatalog.postRequestAction',
    toRequestStatus: 'posted',
    colorClass: 'icon-button--edit',
  },
  posted: {
    labelKey: 'toolCatalog.moveToDraftAction',
    toRequestStatus: 'draft',
  },
}
export const EMPTY_TOOL_FORM = {
  title: '',
  domain: '',
  description: '',
}

export function isToolFormValid(form) {
  return Boolean(form.title.trim()) && Boolean(form.domain) && Boolean(form.description.trim())
}
