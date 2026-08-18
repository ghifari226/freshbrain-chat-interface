export const ENTRY_TYPES = ['definition', 'document', 'alias']
export const STATUSES = ['posted', 'draft']
export const STATUS_COLOR = {
  draft: 'default',
  posted: 'info',
}
export const STATUS_TRANSITION_BY_STATUS = {
  draft: {
    labelKey: 'freshpedia.postRequestAction',
    toStatus: 'posted',
    colorClass: 'icon-button--edit',
  },
  posted: {
    labelKey: 'freshpedia.moveToDraftAction',
    toStatus: 'draft',
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
