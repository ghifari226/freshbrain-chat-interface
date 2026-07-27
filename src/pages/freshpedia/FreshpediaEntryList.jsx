import { Chip, Tooltip } from '@mui/material'
import { STATUS_COLOR, TRANSITION_BY_STATUS } from './freshpediaConfig.js'

function entryDescriptor(entry, entries, t) {
  if (entry.type === 'alias') {
    const target = entries.find((candidate) => candidate.id === entry.aliasTargetId)
    return `${t('freshpedia.aliasType')} (${target?.title ?? entry.aliasTargetId})`
  }
  return t(`freshpedia.${entry.type}Type`)
}

export default function FreshpediaEntryList({
  canChangeStatus,
  canViewRequest,
  entries,
  onEdit,
  onTransition,
  t,
  visibleEntries,
}) {
  return (
    <ul className="entry-index">
      {visibleEntries.map((entry) => {
        const canEdit = canChangeStatus || (canViewRequest && entry.status === 'request')
        const transition = TRANSITION_BY_STATUS[entry.status]
        return (
          <li className="entry-index__entry" key={entry.id}>
            <div className="entry-index__entry-row">
              <span className="entry-index__entry-label">
                {entry.title}{' '}
                <span className="entry-index__entry-desc">
                  — {entryDescriptor(entry, entries, t)}
                </span>
              </span>
              <div className="entry-index__actions">
                <Chip
                  label={t(`freshpedia.${entry.status}Status`)}
                  size="small"
                  color={STATUS_COLOR[entry.status]}
                  variant={entry.status === 'request' ? 'outlined' : 'filled'}
                />
                {canChangeStatus && transition && (
                  <Tooltip title={t(transition.labelKey)}>
                    <button
                      type="button"
                      className={`icon-button ${transition.colorClass}`}
                      aria-label={t(transition.labelKey)}
                      onClick={() => onTransition(entry)}
                    >
                      <i className={`fa-solid ${transition.icon}`} />
                    </button>
                  </Tooltip>
                )}
                {canEdit && (
                  <Tooltip title={t('freshpedia.editEntryAction')}>
                    <button
                      type="button"
                      className="icon-button icon-button--edit"
                      aria-label={t('freshpedia.editEntryAction')}
                      onClick={() => onEdit(entry)}
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          </li>
        )
      })}
      {visibleEntries.length === 0 && (
        <li className="config-section__notice">{t('freshpedia.noEntriesNotice')}</li>
      )}
    </ul>
  )
}
