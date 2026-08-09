import { ArrowDown, ArrowUp, Eye, Pencil } from 'lucide-react'
import {
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'
import {
  REQUEST_STATUS_COLOR,
  REQUEST_STATUS_TRANSITION_BY_STATUS,
  TOOL_STATUS_COLOR,
} from './toolCatalogConfig.js'
// Live tools (status: production/staging, code-owned, GET /tools) and
// tool requests (status: draft/posted/live, Postgres-owned, /tool-requests)
// are two independent sources sharing this table only for layout — the
// two branches below never mix status vocabularies.
function statusChipProps(row, isRequestView, t) {
  if (isRequestView) {
    return {
      label: row.status === 'live' ? t('toolCatalog.liveTabLabel') : t(`toolCatalog.${row.status}Status`),
      color: REQUEST_STATUS_COLOR[row.status],
    }
  }
  return { label: t(`toolCatalog.${row.status}Status`), color: TOOL_STATUS_COLOR[row.status] }
}

export default function ToolCatalogTable({
  canChangeRequestStatus,
  canEdit,
  isRequestView,
  onChangeRequestStatus,
  onEdit,
  rows,
  t,
}) {
  const showActionsColumn = isRequestView && (canEdit || canChangeRequestStatus)
  return (
    <TableContainer className="data-table-container">
      <Table className="data-table" size="small" aria-label={t('toolCatalog.title')}>
        <TableHead>
          <TableRow>
            <TableCell>{t('toolCatalog.systemLabel')}</TableCell>
            <TableCell>{t('toolCatalog.toolColumn')}</TableCell>
            <TableCell>{t('toolCatalog.statusColumn')}</TableCell>
            {showActionsColumn && (
              <TableCell className="data-table__actions-cell" aria-label="Actions" />
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const chip = statusChipProps(row, isRequestView, t)
            const requestStatusTransition = isRequestView
              ? REQUEST_STATUS_TRANSITION_BY_STATUS[row.status]
              : undefined
            return (
              <TableRow key={row.id} hover>
                <TableCell>{row.domain}</TableCell>
                <TableCell>{isRequestView ? row.title : row.displayName}</TableCell>
                <TableCell>
                  <Chip
                    label={chip.label}
                    size="small"
                    color={chip.color}
                    variant={isRequestView ? 'outlined' : 'filled'}
                  />
                </TableCell>
                {showActionsColumn && (
                  <TableCell className="data-table__actions-cell">
                    {canChangeRequestStatus && requestStatusTransition && (
                      <Tooltip title={t(requestStatusTransition.labelKey)}>
                        <IconButton
                          size="small"
                          onClick={() => onChangeRequestStatus(row, requestStatusTransition.toRequestStatus)}
                        >
                          {requestStatusTransition.toRequestStatus === 'posted' ? (
                            <ArrowUp className={`table-action-icon ${requestStatusTransition.colorClass ?? ''}`} />
                          ) : (
                            <ArrowDown className="table-action-icon" />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    {canEdit && (
                      <Tooltip
                        title={t(
                          row.status === 'live' ? 'toolCatalog.viewRequestAction' : 'toolCatalog.editRequestAction',
                        )}
                      >
                        <IconButton size="small" onClick={() => onEdit(row)}>
                          {row.status === 'live' ? (
                            <Eye className="table-action-icon" />
                          ) : (
                            <Pencil
                              className="table-action-icon icon-button--edit"
                              fill="currentColor"
                            />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
