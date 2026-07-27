import { Pencil } from 'lucide-react'
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
import { TOOL_STATUS_COLOR } from './toolCatalogConfig.js'

export default function ToolCatalogTable({ isRequestView, onEdit, rows, t }) {
  return (
    <TableContainer className="data-table-container">
      <Table className="data-table" size="small" aria-label={t('toolCatalog.title')}>
        <TableHead>
          <TableRow>
            <TableCell>{t('toolCatalog.systemLabel')}</TableCell>
            <TableCell>{t('toolCatalog.toolColumn')}</TableCell>
            <TableCell>{t('toolCatalog.statusColumn')}</TableCell>
            {isRequestView && (
              <TableCell className="data-table__actions-cell" aria-label="Actions" />
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.system}</TableCell>
              <TableCell>{row.displayName}</TableCell>
              <TableCell>
                <Chip
                  label={t(`toolCatalog.${row.status}Status`)}
                  size="small"
                  color={TOOL_STATUS_COLOR[row.status]}
                  variant={row.status === 'request' ? 'outlined' : 'filled'}
                />
              </TableCell>
              {isRequestView && (
                <TableCell className="data-table__actions-cell">
                  <Tooltip title={t('toolCatalog.editRequestAction')}>
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <Pencil
                        className="table-action-icon icon-button--edit"
                        fill="currentColor"
                      />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
