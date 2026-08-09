import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { isToolFormValid } from './toolCatalogConfig.js'

function ToolEntryForm({ form, setForm, systems, isReadOnly, t }) {
  return (
    <>
      <div className="form-field">
        <label className="form-field__label" htmlFor="tool-title">
          {t('toolCatalog.nameLabel')}
        </label>
        <input
          id="tool-title"
          className="form-field__input"
          type="text"
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
          placeholder={t('toolCatalog.namePlaceholder')}
          disabled={isReadOnly}
        />
      </div>

      <div className="form-field">
        <label className="form-field__label" htmlFor="tool-domain">
          {t('toolCatalog.systemLabel')}
        </label>
        <Autocomplete
          id="tool-domain"
          size="small"
          autoHighlight
          disabled={isReadOnly}
          options={systems}
          value={systems.find((entry) => entry.system === form.domain) ?? null}
          getOptionLabel={(entry) => entry?.label ?? ''}
          isOptionEqualToValue={(option, current) => option.system === current.system}
          onChange={(_event, value) =>
            setForm((current) => ({ ...current, domain: value?.system ?? '' }))
          }
          renderInput={(params) => (
            <TextField {...params} placeholder={t('toolCatalog.systemLabel')} />
          )}
        />
      </div>

      <div className="form-field">
        <label className="form-field__label" htmlFor="tool-description">
          {t('toolCatalog.descriptionLabel')}
        </label>
        <textarea
          id="tool-description"
          className="form-field__input"
          rows={4}
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
          placeholder={t('toolCatalog.descriptionPlaceholder')}
          disabled={isReadOnly}
        />
      </div>
    </>
  )
}

export default function ToolEntryDialog({
  form,
  formError,
  isEditMode,
  isOpen,
  isReadOnly,
  isSubmitting,
  onClose,
  onSubmit,
  setForm,
  systems,
  t,
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditMode ? form.title : t('toolCatalog.addEntry')}</DialogTitle>
      <DialogContent>
        {isReadOnly && <p className="config-section__notice">{t('toolCatalog.viewOnlyLiveRequestNotice')}</p>}
        <form
          id="tool-form"
          className="auth-form config-add-form"
          onSubmit={onSubmit}
        >
          <ToolEntryForm form={form} setForm={setForm} systems={systems} isReadOnly={isReadOnly} t={t} />
          {formError && <span className="form-field__error">{formError}</span>}
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t(isReadOnly ? 'config.close' : 'toolCatalog.cancelEntry')}</Button>
        {!isReadOnly && (
          <Button
            type="submit"
            form="tool-form"
            variant="contained"
            disabled={isSubmitting || !isToolFormValid(form)}
          >
            {t(isEditMode ? 'toolCatalog.saveEntry' : 'toolCatalog.addEntrySubmit')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
