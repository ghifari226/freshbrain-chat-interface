import { Chip } from '@mui/material'
import CatalogStatusFilters from '../../components/catalog/CatalogStatusFilters.jsx'

export default function ToolCatalogFilters({
  availableStatuses,
  isStatusActive,
  onToggleStatus,
  systems,
  selectedSystems,
  onToggleSystem,
  searchQuery,
  setSearchQuery,
  t,
}) {
  if (availableStatuses.length <= 1 && systems.length === 0) return null

  return (
    <div className="filter-bar">
      <div className="filter-bar__chip-groups">
        <CatalogStatusFilters
          availableStatuses={availableStatuses}
          isStatusActive={isStatusActive}
          labelForStatus={(status) => t(`toolCatalog.${status}Status`)}
          onToggle={onToggleStatus}
          ariaLabel={t('toolCatalog.filterByStatusLabel')}
        />

        {availableStatuses.length > 1 && systems.length > 0 && (
          <span className="filter-bar__divider" />
        )}

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
