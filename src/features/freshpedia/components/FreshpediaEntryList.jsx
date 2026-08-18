import { Chip, Tooltip } from '@mui/material'
import { ArrowDown, ArrowUp, Pencil } from 'lucide-react'
import { STATUS_COLOR, STATUS_TRANSITION_BY_STATUS } from '../model/freshpediaConfig.js'

function entryDescriptor(entry, entries, t) {
  if (entry.type === 'alias') {
    const target = entries.find((candidate) => candidate.id === entry.aliasTargetId)
    return `${t('freshpedia.aliasType')} (${target?.title ?? entry.aliasTargetId})`
  }
  return t(`freshpedia.${entry.type}Type`)
}

export default function FreshpediaEntryList({
  canChangeStatus,
  canEdit,
  entries,
  onChangeStatus,
  onEdit,
  t,
  visibleEntries,
}) {
  return (
    <ul className="entry-index">
      {visibleEntries.map((entry) => {
        const transition = STATUS_TRANSITION_BY_STATUS[entry.status]
        return (
          <li className="entry-index__entry" key={entry.id}>
            <div className="entry-index__entry-row entry-index__entry-row--with-chip">
              <span className="entry-index__entry-label">
                {entry.title}{' '}
                <span className="entry-index__entry-desc">
                  — {entryDescriptor(entry, entries, t)}
                </span>
              </span>
              <div className="entry-index__status-chip-slot">
                <Chip
                  label={t(`freshpedia.${entry.status}Status`)}
                  size="small"
                  color={STATUS_COLOR[entry.status]}
                  variant={entry.status === 'draft' ? 'outlined' : 'filled'}
                />
              </div>
              <div className="entry-index__actions">
                {canChangeStatus && transition && (
                  <Tooltip title={t(transition.labelKey)}>
                    <button
                      type="button"
                      className={`icon-button ${transition.colorClass ?? ''}`}
                      aria-label={t(transition.labelKey)}
                      onClick={() => onChangeStatus(entry, transition.toStatus)}
                    >
                      {transition.toStatus === 'posted' ? <ArrowUp /> : <ArrowDown />}
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
                      <Pencil fill="currentColor" />
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
