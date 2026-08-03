import { Chip, Tooltip } from '@mui/material'
import { ArrowDown, ArrowUp, Check, Pencil } from 'lucide-react'
import {
  REQUEST_STATUS_COLOR,
  REQUEST_STATUS_TRANSITION_BY_STATUS,
  STATUS_COLOR,
  TRANSITION_BY_STATUS,
} from './freshpediaConfig.js'

function entryDescriptor(entry, entries, t) {
  if (entry.type === 'alias') {
    const target = entries.find((candidate) => candidate.id === entry.aliasTargetId)
    return `${t('freshpedia.aliasType')} (${target?.title ?? entry.aliasTargetId})`
  }
  return t(`freshpedia.${entry.type}Type`)
}

// On the Request tab, the status chip shows the request-pipeline lifecycle
// (Draft/Posted/Live-frozen) instead of the live `status` field — 'live'
// here means "promoted, requestStatus frozen", not the Live tab itself.
function statusChipProps(entry, isRequestActive, t) {
  if (isRequestActive && entry.requestStatus) {
    return {
      label:
        entry.requestStatus === 'live'
          ? t('freshpedia.liveTabLabel')
          : t(`freshpedia.${entry.requestStatus}Status`),
      color: REQUEST_STATUS_COLOR[entry.requestStatus],
    }
  }
  return { label: t(`freshpedia.${entry.status}Status`), color: STATUS_COLOR[entry.status] }
}

export default function FreshpediaEntryList({
  canChangeRequestStatus,
  canChangeStatus,
  canEditLive,
  canEditRequest,
  canPromote,
  entries,
  isRequestActive,
  onChangeRequestStatus,
  onEdit,
  onPromote,
  onTransition,
  t,
  visibleEntries,
}) {
  return (
    <ul className="entry-index">
      {visibleEntries.map((entry) => {
        const canEdit = entry.status === 'request' ? canEditRequest : canEditLive
        const transition = TRANSITION_BY_STATUS[entry.status]
        const requestStatusTransition =
          entry.status === 'request' ? REQUEST_STATUS_TRANSITION_BY_STATUS[entry.requestStatus] : undefined
        const chip = statusChipProps(entry, isRequestActive, t)
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
                  label={chip.label}
                  size="small"
                  color={chip.color}
                  variant={entry.status === 'request' ? 'outlined' : 'filled'}
                />
              </div>
              <div className="entry-index__actions">
                {canChangeRequestStatus && requestStatusTransition && (
                  <Tooltip title={t(requestStatusTransition.labelKey)}>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={t(requestStatusTransition.labelKey)}
                      onClick={() => onChangeRequestStatus(entry, requestStatusTransition.toRequestStatus)}
                    >
                      {requestStatusTransition.toRequestStatus === 'posted' ? <ArrowUp /> : <ArrowDown />}
                    </button>
                  </Tooltip>
                )}
                {canChangeStatus && transition && (
                  <Tooltip title={t(transition.labelKey)}>
                    <button
                      type="button"
                      className={`icon-button ${transition.colorClass}`}
                      aria-label={t(transition.labelKey)}
                      onClick={() => onTransition(entry)}
                    >
                      {transition.direction === 'up' ? <ArrowUp /> : <ArrowDown />}
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
                {canPromote && entry.status === 'request' && entry.requestStatus === 'posted' && (
                  <Tooltip title={t('freshpedia.promoteToStagingAction')}>
                    <button
                      type="button"
                      className="icon-button icon-button--success"
                      aria-label={t('freshpedia.promoteToStagingAction')}
                      onClick={() => onPromote(entry)}
                    >
                      <Check />
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
