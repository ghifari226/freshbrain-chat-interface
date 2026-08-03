import { ArrowDown, ArrowUp, Check, Pencil } from 'lucide-react'
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

// On the Request view, the status chip shows the request-pipeline
// lifecycle (Draft/Posted/Live-frozen) instead of the live `status` field
// — same reasoning as FreshpediaEntryList.jsx's statusChipProps.
function statusChipProps(row, isRequestView, t) {
  if (isRequestView && row.requestStatus) {
    return {
      label:
        row.requestStatus === 'live'
          ? t('toolCatalog.liveTabLabel')
          : t(`toolCatalog.${row.requestStatus}Status`),
      color: REQUEST_STATUS_COLOR[row.requestStatus],
    }
  }
  return { label: t(`toolCatalog.${row.status}Status`), color: TOOL_STATUS_COLOR[row.status] }
}

export default function ToolCatalogTable({
  canChangeRequestStatus,
  canEdit,
  canPromote,
  isRequestView,
  onChangeRequestStatus,
  onEdit,
  onPromote,
  rows,
  t,
}) {
  const showActionsColumn = isRequestView && (canEdit || canPromote || canChangeRequestStatus)
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
            const requestStatusTransition =
              row.status === 'request' ? REQUEST_STATUS_TRANSITION_BY_STATUS[row.requestStatus] : undefined
            return (
              <TableRow key={row.id} hover>
                <TableCell>{row.system}</TableCell>
                <TableCell>{row.displayName}</TableCell>
                <TableCell>
                  <Chip
                    label={chip.label}
                    size="small"
                    color={chip.color}
                    variant={row.status === 'request' ? 'outlined' : 'filled'}
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
                            <ArrowUp className="table-action-icon" />
                          ) : (
                            <ArrowDown className="table-action-icon" />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    {canEdit && (
                      <Tooltip title={t('toolCatalog.editRequestAction')}>
                        <IconButton size="small" onClick={() => onEdit(row)}>
                          <Pencil
                            className="table-action-icon icon-button--edit"
                            fill="currentColor"
                          />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canPromote && row.status === 'request' && row.requestStatus === 'posted' && (
                      <Tooltip title={t('toolCatalog.promoteToStagingAction')}>
                        <IconButton size="small" onClick={() => onPromote(row)}>
                          <Check className="table-action-icon icon-button--success" />
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
