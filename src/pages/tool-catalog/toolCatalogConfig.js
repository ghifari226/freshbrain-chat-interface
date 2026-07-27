export const TOOL_STATUS_COLOR = {
  production: 'success',
  staging: 'warning',
  request: 'default',
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
