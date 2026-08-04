export const TOOL_STATUS_COLOR = {
  production: 'success',
  staging: 'warning',
  request: 'default',
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
  system: '',
  name: '',
  description: '',
  exampleQuestions: [],
}

export function isToolFormValid(form) {
  return Boolean(form.system) && Boolean(form.name.trim()) && Boolean(form.description.trim())
}
