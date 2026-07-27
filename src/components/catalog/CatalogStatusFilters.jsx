import { Chip } from '@mui/material'

export default function CatalogStatusFilters({
  availableStatuses,
  isStatusActive,
  labelForStatus,
  onToggle,
  ariaLabel,
}) {
  if (availableStatuses.length <= 1) return null

  return (
    <div className="filter-bar__chips" role="group" aria-label={ariaLabel}>
      {availableStatuses.map((status) => {
        const isActive = isStatusActive(status)
        return (
          <Chip
            key={status}
            label={labelForStatus(status)}
            size="small"
            clickable
            onClick={() => onToggle(status)}
            color={isActive ? 'primary' : 'default'}
            variant={isActive ? 'filled' : 'outlined'}
          />
        )
      })}
    </div>
  )
}
