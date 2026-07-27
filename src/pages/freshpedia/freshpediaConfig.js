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
    icon: 'fa-arrow-down',
    colorClass: 'icon-button--warning',
  },
  staging: {
    labelKey: 'freshpedia.promoteToProductionAction',
    toStatus: 'production',
    icon: 'fa-arrow-up',
    colorClass: 'icon-button--success',
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
