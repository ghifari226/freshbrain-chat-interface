import { Chip } from '@mui/material'
import CatalogStatusFilters from '../../components/catalog/CatalogStatusFilters.jsx'
import { ENTRY_TYPES } from './freshpediaConfig.js'

export default function FreshpediaFilters({
  availableStatuses,
  isStatusActive,
  onToggleStatus,
  searchQuery,
  setSearchQuery,
  selectedTypes,
  onToggleType,
  t,
}) {
  return (
    <div className="filter-bar">
      <div className="filter-bar__chip-groups">
        <CatalogStatusFilters
          availableStatuses={availableStatuses}
          isStatusActive={isStatusActive}
          labelForStatus={(status) => t(`freshpedia.${status}Status`)}
          onToggle={onToggleStatus}
          ariaLabel={t('freshpedia.filterByStatusLabel')}
        />

        {availableStatuses.length > 1 && <span className="filter-bar__divider" />}

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
