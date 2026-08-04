export const TOOL_STATUS_COLOR = {
  production: 'success',
  staging: 'warning',
  request: 'default',
}

// Chip color for the Request tab's status badge, keyed by requestStatus —
// see freshpediaConfig.js's REQUEST_STATUS_COLOR for the identical
// reasoning (Tools follows the same Draft/Posted/Live-frozen lifecycle).
export const REQUEST_STATUS_COLOR = {
  draft: 'default',
  posted: 'info',
  live: 'success',
}

// The Draft<->Posted toggle — see freshpediaConfig.js's
// REQUEST_STATUS_TRANSITION_BY_STATUS for the identical reasoning.
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
