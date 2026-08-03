import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { ENTRY_TYPES, isFreshpediaFormValid } from './freshpediaConfig.js'

function FreshpediaEntryForm({ form, setForm, existingEntries, isReadOnly, t }) {
  return (
    <>
      <div className="form-field">
        <label className="form-field__label" htmlFor="entry-title">
          {t('freshpedia.entryTitleLabel')}
        </label>
        <input
          id="entry-title"
          className="form-field__input"
          type="text"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder={t('freshpedia.entryTitlePlaceholder')}
          disabled={isReadOnly}
        />
      </div>

      <div className="form-field">
        <label className="form-field__label" htmlFor="entry-type">
          {t('freshpedia.entryTypeLabel')}
        </label>
        <Autocomplete
          id="entry-type"
          size="small"
          disableClearable
          autoHighlight
          disabled={isReadOnly}
          options={ENTRY_TYPES}
          value={form.type}
          getOptionLabel={(type) => t(`freshpedia.${type}Type`)}
          isOptionEqualToValue={(option, current) => option === current}
          onChange={(_event, value) =>
            setForm((current) => ({ ...current, type: value ?? current.type }))
          }
          renderInput={(params) => (
            <TextField {...params} placeholder={t('freshpedia.entryTypeLabel')} />
          )}
        />
      </div>

      {form.type === 'definition' && (
        <div className="form-field">
          <label className="form-field__label" htmlFor="entry-content">
            {t('freshpedia.contentLabel')}
          </label>
          <textarea
            id="entry-content"
            className="form-field__input"
            rows={6}
            value={form.content}
            onChange={(event) =>
              setForm((current) => ({ ...current, content: event.target.value }))
            }
            placeholder={t('freshpedia.contentPlaceholder')}
            disabled={isReadOnly}
          />
        </div>
      )}

      {form.type === 'document' && (
        <div className="form-field">
          <label className="form-field__label" htmlFor="entry-file">
            {t('freshpedia.fileUploadLabel')}
          </label>
          <input
            id="entry-file"
            type="file"
            accept="application/pdf"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fileName: event.target.files[0]?.name ?? '',
              }))
            }
            disabled={isReadOnly}
          />
          {form.fileName && <span className="form-field__hint">{form.fileName}</span>}
        </div>
      )}

      {form.type === 'alias' && (
        <>
          <div className="form-field">
            <label className="form-field__label" htmlFor="entry-alias-target">
              {t('freshpedia.aliasTargetLabel')}
            </label>
            <Autocomplete
              id="entry-alias-target"
              size="small"
              autoHighlight
              disabled={isReadOnly}
              options={existingEntries.filter((entry) => entry.type !== 'alias')}
              value={
                existingEntries.find((entry) => entry.id === form.aliasTargetId) ?? null
              }
              getOptionLabel={(entry) => entry?.title ?? ''}
              isOptionEqualToValue={(option, current) => option.id === current.id}
              onChange={(_event, value) =>
                setForm((current) => ({
                  ...current,
                  aliasTargetId: value?.id ?? null,
                }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={t('freshpedia.aliasTargetPlaceholder')}
                />
              )}
            />
          </div>
          <div className="form-field">
            <label className="form-field__label" htmlFor="entry-alias-phrase">
              {t('freshpedia.aliasPhraseLabel')}
            </label>
            <input
              id="entry-alias-phrase"
              className="form-field__input"
              type="text"
              value={form.aliasPhrase}
              onChange={(event) =>
                setForm((current) => ({ ...current, aliasPhrase: event.target.value }))
              }
              placeholder={t('freshpedia.aliasPhrasePlaceholder')}
              disabled={isReadOnly}
            />
          </div>
        </>
      )}
    </>
  )
}

export default function FreshpediaEntryDialog({
  form,
  formError,
  isEditMode,
  isOpen,
  isReadOnly,
  isSubmitting,
  entries,
  onClose,
  onSubmit,
  setForm,
  t,
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditMode ? form.title : t('freshpedia.addEntry')}</DialogTitle>
      <DialogContent>
        {isReadOnly && <p className="config-section__notice">{t('freshpedia.viewOnlyLiveRequestNotice')}</p>}
        <form
          id="entry-form"
          className="auth-form config-add-form"
          onSubmit={onSubmit}
        >
          <FreshpediaEntryForm
            form={form}
            setForm={setForm}
            existingEntries={entries}
            isReadOnly={isReadOnly}
            t={t}
          />
          {formError && <span className="form-field__error">{formError}</span>}
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t(isReadOnly ? 'config.close' : 'freshpedia.cancelEntry')}</Button>
        {!isReadOnly && (
          <Button
            type="submit"
            form="entry-form"
            variant="contained"
            disabled={isSubmitting || !isFreshpediaFormValid(form)}
          >
            {t(isEditMode ? 'freshpedia.saveEntry' : 'freshpedia.addEntrySubmit')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
