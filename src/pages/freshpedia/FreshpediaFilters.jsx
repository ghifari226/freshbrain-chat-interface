import { Chip } from '@mui/material'
import CatalogStatusFilters from '../../components/catalog/CatalogStatusFilters.jsx'
import { ENTRY_TYPES } from './freshpediaConfig.js'

// requestStatus's chip label follows FreshpediaEntryList.jsx's
// statusChipProps convention — 'live' means "promoted, frozen", shown with
// the same liveTabLabel text as the outer Live tab.
function labelForRequestStatus(status, t) {
  return status === 'live' ? t('freshpedia.liveTabLabel') : t(`freshpedia.${status}Status`)
}

export default function FreshpediaFilters({
  availableLiveStatuses,
  isLiveStatusActive,
  onToggleLiveStatus,
  availableRequestStatuses,
  isRequestStatusActive,
  onToggleRequestStatus,
  isRequestActive,
  searchQuery,
  setSearchQuery,
  selectedTypes,
  onToggleType,
  t,
}) {
  return (
    <div className="filter-bar">
      <div className="filter-bar__chip-groups">
        {!isRequestActive && (
          <CatalogStatusFilters
            availableStatuses={availableLiveStatuses}
            isStatusActive={isLiveStatusActive}
            labelForStatus={(status) => t(`freshpedia.${status}Status`)}
            onToggle={onToggleLiveStatus}
            ariaLabel={t('freshpedia.filterByStatusLabel')}
          />
        )}

        {isRequestActive && (
          <CatalogStatusFilters
            availableStatuses={availableRequestStatuses}
            isStatusActive={isRequestStatusActive}
            labelForStatus={(status) => labelForRequestStatus(status, t)}
            onToggle={onToggleRequestStatus}
            ariaLabel={t('freshpedia.filterByStatusLabel')}
          />
        )}

        {((!isRequestActive && availableLiveStatuses.length > 1) ||
          (isRequestActive && availableRequestStatuses.length > 1)) && (
          <span className="filter-bar__divider" />
        )}

        <div
          className="filter-bar__chips"
          role="group"
          aria-label={t('freshpedia.filterByTypeLabel')}
        >
          {ENTRY_TYPES.map((type) => {
            const isActive = selectedTypes.has(type)
            return (
              <Chip
                key={type}
                label={t(`freshpedia.${type}Type`)}
                size="small"
                clickable
                onClick={() => onToggleType(type)}
                variant={isActive ? 'filled' : 'outlined'}
                className={isActive ? 'chip--secondary-active' : undefined}
              />
            )
          })}
        </div>
      </div>
      <input
        type="search"
        className="form-field__input filter-bar__search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={t('freshpedia.searchPlaceholder')}
        aria-label={t('freshpedia.searchPlaceholder')}
      />
    </div>
  )
}
