import { Lock } from 'lucide-react'
import { Tooltip } from '@mui/material'
import { PERMISSION_LABEL_KEYS } from '../../config/permissions.js'
export default function PermissionCheckboxGroup({
  titleKey,
  fields,
  permissions,
  isFieldLocked,
  isFieldDisabled,
  onToggle,
  onToggleAll,
  t,
}) {
  const toggleableFields = fields.filter((field) => !isFieldLocked(field) && !isFieldDisabled(field))
  const checkedCount = toggleableFields.filter((field) => Boolean(permissions[field])).length
  const allChecked = toggleableFields.length > 0 && checkedCount === toggleableFields.length
  const someChecked = checkedCount > 0 && !allChecked

  return (
    <div className="permission-group">
      <div className="permission-group__header">
        <span className="permission-group__label">{t(titleKey)}</span>
        {toggleableFields.length > 0 && (
          <Tooltip title={t('permissions.selectAllToggle')}>
            <input
              type="checkbox"
              className="permission-group__select-all"
              aria-label={t('permissions.selectAllToggle')}
              checked={allChecked}
              ref={(element) => {
                if (element) element.indeterminate = someChecked
              }}
              onChange={() => onToggleAll(toggleableFields, !allChecked)}
            />
          </Tooltip>
        )}
      </div>
      {fields.map((field) => {
        const locked = isFieldLocked(field)
        return (
          <label className="permission-checkbox" key={field}>
            <input
              type="checkbox"
              checked={locked || Boolean(permissions[field])}
              disabled={locked || isFieldDisabled(field)}
              onChange={() => onToggle(field)}
            />
            <span className="permission-checkbox__label">
              {locked && <Lock />} {t(PERMISSION_LABEL_KEYS[field] ?? field)}
            </span>
          </label>
        )
      })}
    </div>
  )
}
