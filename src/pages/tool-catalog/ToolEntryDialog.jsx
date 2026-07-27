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

function ToolEntryForm({ form, setForm, systems, t }) {
  function updateQuestion(index, value) {
    setForm((current) => ({
      ...current,
      exampleQuestions: current.exampleQuestions.map((question, questionIndex) =>
        questionIndex === index ? value : question,
      ),
    }))
  }

  function addQuestion() {
    setForm((current) => ({
      ...current,
      exampleQuestions: [...current.exampleQuestions, ''],
    }))
  }

  function removeQuestion(index) {
    setForm((current) => ({
      ...current,
      exampleQuestions: current.exampleQuestions.filter(
        (_question, questionIndex) => questionIndex !== index,
      ),
    }))
  }

  return (
    <>
      <div className="form-field">
        <label className="form-field__label" htmlFor="tool-system">
          {t('toolCatalog.systemLabel')}
        </label>
        <Autocomplete
          id="tool-system"
          size="small"
          autoHighlight
          options={systems}
          value={systems.find((entry) => entry.system === form.system) ?? null}
          getOptionLabel={(entry) => entry?.label ?? ''}
          isOptionEqualToValue={(option, current) => option.system === current.system}
          onChange={(_event, value) =>
            setForm((current) => ({ ...current, system: value?.system ?? '' }))
          }
          renderInput={(params) => (
            <TextField {...params} placeholder={t('toolCatalog.systemLabel')} />
          )}
        />
      </div>

      <div className="form-field">
        <label className="form-field__label" htmlFor="tool-name">
          {t('toolCatalog.nameLabel')}
        </label>
        <input
          id="tool-name"
          className="form-field__input"
          type="text"
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              name: event.target.value.toLowerCase(),
            }))
          }
          placeholder={t('toolCatalog.namePlaceholder')}
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
        />
      </div>

      <div className="form-field">
        <label className="form-field__label">
          {t('toolCatalog.exampleQuestionsLabel')}
        </label>
        {form.exampleQuestions.map((question, index) => (
          <div className="form-field__list-row" key={index}>
            <input
              className="form-field__input"
              type="text"
              value={question}
              onChange={(event) => updateQuestion(index, event.target.value)}
              placeholder={t('toolCatalog.exampleQuestionPlaceholder')}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={t('toolCatalog.removeQuestionAction')}
              onClick={() => removeQuestion(index)}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ))}
        <Button size="small" onClick={addQuestion}>
          {t('toolCatalog.addQuestionAction')}
        </Button>
      </div>
    </>
  )
}

export default function ToolEntryDialog({
  form,
  formError,
  isEditMode,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  setForm,
  systems,
  t,
}) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>
        {isEditMode ? `${form.system}.${form.name}` : t('toolCatalog.addEntry')}
      </DialogTitle>
      <DialogContent>
        <form
          id="tool-form"
          className="auth-form config-add-form"
          onSubmit={onSubmit}
        >
          <ToolEntryForm form={form} setForm={setForm} systems={systems} t={t} />
          {formError && <span className="form-field__error">{formError}</span>}
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('toolCatalog.cancelEntry')}</Button>
        <Button
          type="submit"
          form="tool-form"
          variant="contained"
          disabled={isSubmitting || !isToolFormValid(form)}
        >
          {t(isEditMode ? 'toolCatalog.saveEntry' : 'toolCatalog.addEntrySubmit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
