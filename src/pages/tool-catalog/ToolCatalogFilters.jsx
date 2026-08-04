import { Chip } from '@mui/material'
import CatalogStatusFilters from '../../components/catalog/CatalogStatusFilters.jsx'
function labelForRequestStatus(status, t) {
  return status === 'live' ? t('toolCatalog.liveTabLabel') : t(`toolCatalog.${status}Status`)
}

export default function ToolCatalogFilters({
  availableLiveStatuses,
  isLiveStatusActive,
  onToggleLiveStatus,
  availableRequestStatuses,
  isRequestStatusActive,
  onToggleRequestStatus,
  isRequestActive,
  systems,
  selectedSystems,
  onToggleSystem,
  searchQuery,
  setSearchQuery,
  t,
}) {
  const hasStatusChips = isRequestActive ? availableRequestStatuses.length > 1 : availableLiveStatuses.length > 1
  if (!hasStatusChips && systems.length === 0) return null

  return (
    <div className="filter-bar">
      <div className="filter-bar__chip-groups">
        {!isRequestActive && (
          <CatalogStatusFilters
            availableStatuses={availableLiveStatuses}
            isStatusActive={isLiveStatusActive}
            labelForStatus={(status) => t(`toolCatalog.${status}Status`)}
            onToggle={onToggleLiveStatus}
            ariaLabel={t('toolCatalog.filterByStatusLabel')}
          />
        )}

        {isRequestActive && (
          <CatalogStatusFilters
            availableStatuses={availableRequestStatuses}
            isStatusActive={isRequestStatusActive}
            labelForStatus={(status) => labelForRequestStatus(status, t)}
            onToggle={onToggleRequestStatus}
            ariaLabel={t('toolCatalog.filterByStatusLabel')}
          />
        )}

        {hasStatusChips && systems.length > 0 && <span className="filter-bar__divider" />}

        {systems.length > 0 && (
          <div
            className="filter-bar__chips"
            role="group"
            aria-label={t('toolCatalog.filterBySystemLabel')}
          >
            {systems.map(({ system }) => {
              const isActive = selectedSystems.has(system)
              return (
                <Chip
                  key={system}
                  label={system}
                  size="small"
                  clickable
                  onClick={() => onToggleSystem(system)}
                  variant={isActive ? 'filled' : 'outlined'}
                  className={isActive ? 'chip--secondary-active' : undefined}
                />
              )
            })}
          </div>
        )}
      </div>

      {systems.length > 0 && (
        <input
          type="search"
          className="form-field__input filter-bar__search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('toolCatalog.searchPlaceholder')}
          aria-label={t('toolCatalog.searchPlaceholder')}
        />
      )}
    </div>
  )
}
