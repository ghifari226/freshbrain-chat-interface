import { useEffect, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import { Chip } from '@mui/material'
import StandalonePageLayout from './StandalonePageLayout.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useRoute } from '../hooks/useRoute.js'
import { useT } from '../hooks/useT.js'

// Staging/Production only — see the project note on Freshpedia/Tool
// Catalog's status model. No Draft here: unlike Freshpedia, a tool entry
// isn't hand-authored prose, so there's no meaningful "not ready to be
// browsed yet" state to hide.
const STATUSES = ['staging', 'production']

// No real tool data yet (ai-engine integration isn't built) — this is
// purely the intended shell: status filter chips above an empty grid,
// showing DataGrid's own "no rows" state rather than fabricated rows.
export default function ToolCatalogPage({ language, setLanguage }) {
  const t = useT()
  const { session } = useAuth()
  const [, navigate] = useRoute()
  const isAuthorized = Boolean(session?.chat_tools_view)
  const [selectedStatuses, setSelectedStatuses] = useState(new Set())

  useEffect(() => {
    if (!isAuthorized) navigate('/')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized])

  if (!isAuthorized) return null

  function toggleStatus(status) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const columns = [
    { field: 'name', headerName: t('toolCatalog.toolColumn'), flex: 1 },
    { field: 'status', headerName: t('toolCatalog.statusColumn'), flex: 1 },
  ]

  return (
    <StandalonePageLayout titleKey="toolCatalog.title" language={language} setLanguage={setLanguage}>
      <div className="config-section">
        <div className="filter-bar">
          <div className="filter-bar__chips" role="group" aria-label={t('toolCatalog.filterByStatusLabel')}>
            {STATUSES.map((status) => {
              const isActive = selectedStatuses.has(status)
              return (
                <Chip
                  key={status}
                  label={t(`toolCatalog.${status}Status`)}
                  size="small"
                  clickable
                  onClick={() => toggleStatus(status)}
                  color={isActive ? 'primary' : 'default'}
                  variant={isActive ? 'filled' : 'outlined'}
                />
              )
            })}
          </div>
        </div>

        <DataGrid rows={[]} columns={columns} getRowId={(row) => row.name} autoHeight hideFooter />
      </div>
    </StandalonePageLayout>
  )
}
