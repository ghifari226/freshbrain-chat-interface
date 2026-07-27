import { useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { Chip } from '@mui/material'
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid'
import { TOOL_STATUS_COLOR } from './toolCatalogConfig.js'

export default function ToolCatalogTable({
  isRequestView,
  onEdit,
  rows,
  t,
}) {
  const columns = useMemo(() => {
    const result = [
      { field: 'system', headerName: t('toolCatalog.systemLabel'), flex: 0.6 },
      { field: 'displayName', headerName: t('toolCatalog.toolColumn'), flex: 1 },
      {
        field: 'status',
        headerName: t('toolCatalog.statusColumn'),
        flex: 1,
        renderCell: (params) => (
          <Chip
            label={t(`toolCatalog.${params.value}Status`)}
            size="small"
            color={TOOL_STATUS_COLOR[params.value]}
            variant={params.value === 'request' ? 'outlined' : 'filled'}
          />
        ),
      },
    ]

    if (isRequestView) {
      result.push({
        field: 'rowActions',
        type: 'actions',
        headerName: '',
        width: 48,
        getActions: ({ row }) => [
          <GridActionsCellItem
            key="edit"
            icon={<Pencil className="grid-action-icon icon-button--edit" />}
            label={t('toolCatalog.editRequestAction')}
            onClick={() => onEdit(row)}
          />,
        ],
      })
    }
    return result
  }, [isRequestView, onEdit, t])

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      autoHeight
      hideFooter
    />
  )
}
