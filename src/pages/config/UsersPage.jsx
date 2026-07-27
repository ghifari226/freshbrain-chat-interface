import { useEffect, useMemo, useState } from 'react'
import { Lock, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Autocomplete,
  TextField,
  Chip,
} from '@mui/material'
import { createUser, deleteUser, getAllUsers, updateUser } from '../../services/authService.js'
import { errorMessage, isCanceled } from '../../services/api.js'
import { ROLES, ROLE_LABEL_KEYS } from '../../config/roles.js'
import {
  ALL_PERMISSIONS,
  SYSTEM_ACCESS_PERMISSIONS,
  CHAT_ACCESS_PERMISSIONS,
  PERMISSION_LABEL_KEYS,
  SUPERADMIN_LOCKED_PERMISSIONS,
  canAssignPermissions,
} from '../../config/permissions.js'
import { useT } from '../../hooks/useT.js'
import { useAuth } from '../../hooks/useAuth.js'

// Superadmin is ROLES[0] but is never assignable through this form (see
// roleOptions below) — defaulting to it here would silently create a
// Superadmin unless the admin happened to touch the Role field themselves.
const EMPTY_FORM = { name: '', email: '', phone: '', role: ROLES.find((r) => r !== 'Superadmin') }

// Order-independent — see the identical concern in RolesPage's scopesEqual.
function permissionsEqual(a, b) {
  return ALL_PERMISSIONS.every((field) => Boolean(a[field]) === Boolean(b[field]))
}

function digitsOnly(value) {
  return value.replace(/\D/g, '')
}

// Storage/wire format is pure digits, no +, space, or dash — "6281110000001"
// — matching how phone numbers actually live on the backend; auth-contract.md
// just says `"phone": "string"` and doesn't mandate a display format, so the
// dashed "+62 811-1000-0001" look is purely a presentation concern, applied
// only in this form's input (formatLocalPhoneDigits, the local part after the
// fixed +62 prefix) and the grid column (formatPhoneForDisplay) below.
// 3-4-5 grouping, capped at 12 digits — Indonesian mobile numbers run up to
// 13 digits including the leading trunk 0 (e.g. 0812-3456-78901), and +62
// already stands in for that leading 0, so the local part alone maxes out
// at 12.
function formatLocalPhoneDigits(value) {
  const digits = digitsOnly(value).slice(0, 12)
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 12)].filter(Boolean).join('-')
}

// Reverses formatLocalPhoneDigits — strips the leading 62 country code (if
// present) off a raw stored digit string, back into the dashed local part
// the form's input displays and edits.
function localPhoneDigitsFromStored(phone) {
  const digits = digitsOnly(phone)
  const local = digits.startsWith('62') ? digits.slice(2) : digits
  return formatLocalPhoneDigits(local)
}

function formatPhoneForDisplay(phone) {
  if (!phone) return ''
  return `+62 ${localPhoneDigitsFromStored(phone)}`
}

// A single leading 0 is the familiar local-format habit (0812-3456-7890) —
// accepted on input, but stripped before it's combined with +62 on submit,
// since +62 already stands in for that trunk 0 (otherwise it'd end up
// double-counted, e.g. 620812... instead of 62812...). Anything else is
// submitted as-is, as long as it clears the minimum length.
function significantPhoneDigits(localPart) {
  const digits = digitsOnly(localPart)
  return digits.startsWith('0') ? digits.slice(1) : digits
}

const MIN_PHONE_DIGITS = 9
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// A query starting with "0" is ambiguous: it might be a local-format trunk
// prefix ("0811..." for stored "6281110000001") or just a substring that
// happens to start with 0 (e.g. the last-4-digits "0006"). Rather than
// guessing, try both readings and match if either is found in the phone's
// digits — phone numbers themselves are stored as pure digits starting with
// "62", never with a literal leading 0, so only the query needs the
// alternate form.
function phoneMatches(phoneDigits, queryDigits) {
  if (phoneDigits.includes(queryDigits)) return true
  if (queryDigits.startsWith('0')) return phoneDigits.includes(`62${queryDigits.slice(1)}`)
  return false
}

// One group of checkboxes in the Shield dialog (System Access / Chat
// Access — just two now). isFieldLocked marks Superadmin's hardcoded
// fields (checked+disabled, never editable); isFieldDisabled marks fields
// blocked by the self-escalation guard (actor editing their own row,
// doesn't already hold this field). The header checkbox bulk-selects every
// field in the group that isn't locked/disabled — purely a UI convenience,
// not a stored permission of its own.
function PermissionCheckboxGroup({ titleKey, fields, dialogPermissions, isFieldLocked, isFieldDisabled, onToggle, onToggleAll, t }) {
  const toggleableFields = fields.filter((field) => !isFieldLocked(field) && !isFieldDisabled(field))
  const checkedToggleableCount = toggleableFields.filter((field) => Boolean(dialogPermissions[field])).length
  const allChecked = toggleableFields.length > 0 && checkedToggleableCount === toggleableFields.length
  const someChecked = checkedToggleableCount > 0 && !allChecked

  return (
    <div className="permission-group">
      <div className="permission-group__header">
        <span className="permission-group__label">{t(titleKey)}</span>
        {toggleableFields.length > 0 && (
          <Tooltip title={t('permissions.selectAllToggle')}>
            <input
              type="checkbox"
              className="permission-group__select-all"
              aria-label={t('permissions.selectAllToggle')}
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked
              }}
              onChange={() => onToggleAll(toggleableFields, !allChecked)}
            />
          </Tooltip>
        )}
      </div>
      {fields.map((field) => {
        const locked = isFieldLocked(field)
        return (
          <label className="permission-checkbox" key={field}>
            <input
              type="checkbox"
              checked={locked || Boolean(dialogPermissions[field])}
              disabled={locked || isFieldDisabled(field)}
              onChange={() => onToggle(field)}
            />
            <span className="permission-checkbox__label">
              {locked && <Lock />} {t(PERMISSION_LABEL_KEYS[field])}
            </span>
          </label>
        )
      })}
    </div>
  )
}

export default function UsersPage() {
  const t = useT()
  const { session, updateSession } = useAuth()
  const canAdd = Boolean(session?.['user.add'])
  const canEdit = Boolean(session?.['user.edit'])
  const canDelete = Boolean(session?.['user.delete'])
  const canAssign = canAssignPermissions(session)
  const actorForUpdate = useMemo(
    () => ({ email: session?.email, token: session?.token }),
    [session?.email, session?.token],
  )
  // Superadmin is visible in the table (existing Superadmin users show their
  // real role) but never assignable through this picker — bootstrap-locked,
  // not something granted via the UI, for anyone, regardless of the actor's
  // own permissions.
  const roleOptions = ROLES.filter((r) => r !== 'Superadmin')

  // Mocked, in-memory only — no backend persistence yet, resets on reload.
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  // Unlike Roles/Permissions/Freshpedia/Tool Catalog, this dialog's submit
  // button is never disabled — validation only runs (and these populate)
  // when it's actually clicked, showing a message under each problem field
  // rather than blocking the click itself.
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetLink, setResetLink] = useState(null)
  const [isCopied, setIsCopied] = useState(false)
  // Add and Edit share one dialog/form: null (closed), 'new', or the email
  // of the row being edited — so both flows are the same UI/UX, not two
  // different code paths that could drift apart.
  const [userFormTarget, setUserFormTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [permissionsDialogEmail, setPermissionsDialogEmail] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  // Empty set = no role filter applied (show everyone). Chips are additive
  // (OR within roles), combined with searchQuery as AND.
  const [selectedRoles, setSelectedRoles] = useState(new Set())
  // Draft permission edits, keyed by email — toggling a checkbox only ever
  // touches this, never the API. The upload/cancel icons inside the Shield
  // dialog's title (shown only while dirty) are the only things that either
  // commit this via updateUser or discard it — closing the dialog any other
  // way (backdrop, Escape, the Close button) also discards, so there's never
  // a silently-pending edit left behind once the dialog isn't open.
  const [pendingPermissions, setPendingPermissions] = useState({})
  const isEditMode = Boolean(userFormTarget) && userFormTarget !== 'new'
  const editingUser = isEditMode ? users.find((u) => u.email === userFormTarget) : null
  // Derived from `users`, not a snapshot, so the dialog's title/base data is
  // never stale.
  const permissionsDialogUser = users.find((u) => u.email === permissionsDialogEmail) ?? null
  const dialogPermissions = pendingPermissions[permissionsDialogEmail] ?? permissionsDialogUser ?? {}
  const isPermissionsDialogDirty = permissionsDialogUser
    ? !permissionsEqual(dialogPermissions, permissionsDialogUser)
    : false

  function isSuperadminLockedField(field) {
    return permissionsDialogUser?.role === 'Superadmin' && SUPERADMIN_LOCKED_PERMISSIONS.includes(field)
  }

  // Mirrors updateUser's runtime guard for immediate feedback — the actor
  // can't check a box for a field they don't already hold themselves,
  // whether editing their own row or (structurally impossible here, since
  // the dialog can't even open on someone else without user.assign_permissions)
  // anyone else's.
  function isSelfEscalationBlocked(field) {
    return permissionsDialogEmail === session?.email && !session?.[field]
  }

  // Built from the actual data rather than ROLES — every MOCK_USERS role
  // happens to be a real ROLES entry right now, but this stays
  // data-derived rather than ROLES-derived so a user stored with some
  // other job title would still be filterable by their real role.
  const availableRoles = useMemo(
    () => Array.from(new Set(users.map((u) => u.role))).sort(),
    [users],
  )

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const queryDigits = digitsOnly(searchQuery)
    return users.filter((u) => {
      if (query) {
        const matchesText =
          u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
        const matchesPhone = queryDigits.length > 0 && phoneMatches(digitsOnly(u.phone), queryDigits)
        if (!matchesText && !matchesPhone) return false
      }
      if (selectedRoles.size > 0 && !selectedRoles.has(u.role)) return false
      return true
    })
  }, [users, searchQuery, selectedRoles])

  function toggleRoleFilter(role) {
    setSelectedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }

  // Gates the search/chip filter bar below — without it, the bar renders
  // immediately (with an empty chip row, since availableRoles is derived
  // from users) and then pops once the mock fetch resolves. Waiting for
  // usersLoaded means the filter bar and the grid's real rows appear in the
  // same paint.
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getAllUsers({ signal: controller.signal, token: session?.token })
      .then((data) => {
        setUsers(data)
        setUsersLoaded(true)
      })
      .catch((error) => {
        if (!isCanceled(error)) {
          setLoadError(errorMessage(error))
          setUsersLoaded(true)
        }
      })
    return () => controller.abort()
  }, [session?.token])

  function openAddUserDialog() {
    setForm(EMPTY_FORM)
    setFormError('')
    setFieldErrors({})
    setUserFormTarget('new')
  }

  function openEditUserDialog(row) {
    setForm({ name: row.name, email: row.email, phone: localPhoneDigitsFromStored(row.phone), role: row.role })
    setFormError('')
    setFieldErrors({})
    setUserFormTarget(row.email)
  }

  function closeUserFormDialog() {
    setUserFormTarget(null)
  }

  async function handleSubmitUserForm(event) {
    event.preventDefault()
    setFormError('')

    const errors = {}
    if (!form.name.trim()) errors.name = 'nameRequired'
    if (userFormTarget === 'new') {
      if (!form.email.trim()) errors.email = 'emailRequired'
      else if (!EMAIL_FORMAT.test(form.email.trim())) errors.email = 'emailInvalidFormat'
    }
    if (form.phone && significantPhoneDigits(form.phone).length < MIN_PHONE_DIGITS) {
      errors.phone = 'phoneTooShort'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      if (userFormTarget === 'new') {
        const { resetToken, ...user } = await createUser(
          {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone ? `62${significantPhoneDigits(form.phone)}` : '',
            role: form.role,
          },
          session,
        )
        setUsers((prev) => [...prev, user])
        setResetLink(`/reset/${resetToken}`)
        setIsCopied(false)
      } else {
        const email = userFormTarget
        const updated = await updateUser(
          email,
          { name: form.name.trim(), phone: form.phone ? `62${significantPhoneDigits(form.phone)}` : '', role: form.role },
          actorForUpdate,
        )
        setUsers((prev) => prev.map((u) => (u.email === email ? updated : u)))
        // Only `name` is safe to patch live here — `updated` (from
        // toDirectoryEntry) doesn't carry allowed_scopes, so patching `role`
        // without it would leave the session's role and allowed_scopes
        // pointing at different roles until the next login.
        if (email === session?.email) updateSession({ name: updated.name })
      }
      setForm(EMPTY_FORM)
      setUserFormTarget(null)
    } catch (error) {
      // 'emailTaken' is a translated string key (create-only failure mode);
      // update failures surface updateUser's own message directly since
      // there's no equivalent translated copy for guard rejections that, in
      // practice, the UI already prevents from being reachable (Technology
      // filtered out of the role picker, etc).
      setFormError(userFormTarget === 'new' ? 'emailTaken' : errorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCopyResetLink() {
    navigator.clipboard.writeText(resetLink).then(() => {
      setIsCopied(true)
    })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    await deleteUser(deleteTarget.email, actorForUpdate)
    setUsers((prev) => prev.filter((u) => u.email !== deleteTarget.email))
    setDeleteTarget(null)
  }

  function handleTogglePermission(email, field) {
    setPendingPermissions((prev) => {
      const user = users.find((u) => u.email === email)
      const current = prev[email] ?? user ?? {}
      return { ...prev, [email]: { ...current, [field]: !current[field] } }
    })
  }

  function handleToggleAllPermissions(email, fields, nextValue) {
    setPendingPermissions((prev) => {
      const user = users.find((u) => u.email === email)
      const current = prev[email] ?? user ?? {}
      const next = { ...current }
      for (const field of fields) next[field] = nextValue
      return { ...prev, [email]: next }
    })
  }

  function discardPendingPermissions(email) {
    setPendingPermissions((prev) => {
      const { [email]: _discard, ...rest } = prev
      return rest
    })
  }

  // The only thing that actually calls updateUser for permissions — see
  // handleTogglePermission above, which only ever touches the local draft.
  // Sends only the fields that actually differ from the target's
  // last-synced row (not all 18), so a partial save never accidentally
  // re-submits unchanged values.
  async function handleSavePermissions(email) {
    const next = pendingPermissions[email]
    if (!next) return
    const original = users.find((u) => u.email === email) ?? {}
    const updates = {}
    for (const field of ALL_PERMISSIONS) {
      if (Boolean(next[field]) !== Boolean(original[field])) {
        updates[field] = Boolean(next[field])
      }
    }
    const updated = await updateUser(email, updates, actorForUpdate)
    setUsers((prev) => prev.map((u) => (u.email === email ? updated : u)))
    if (email === session?.email) {
      const patch = {}
      for (const field of ALL_PERMISSIONS) patch[field] = updated[field]
      updateSession(patch)
    }
    discardPendingPermissions(email)
  }

  function closePermissionsDialog() {
    if (permissionsDialogEmail) discardPendingPermissions(permissionsDialogEmail)
    setPermissionsDialogEmail(null)
  }

  const columns = useMemo(() => {
    const base = []

    if (canAssign || canEdit || canDelete) {
      base.push({
        field: 'rowActions',
        type: 'actions',
        headerName: '',
        width: 28 + [canAssign, canEdit, canDelete].filter(Boolean).length * 36,
        getActions: ({ row }) => {
          const actions = []
          if (canEdit) {
            actions.push(
              <GridActionsCellItem
                key="edit"
                icon={<Pencil className="grid-action-icon icon-button--edit" fill="currentColor" />}
                label={t('config.editUser')}
                size="small"
                onClick={() => openEditUserDialog(row)}
              />,
            )
          }
          if (canAssign) {
            actions.push(
              <GridActionsCellItem
                key="permissions"
                icon={<ShieldCheck className="grid-action-icon" />}
                label={t('permissions.sectionLabel')}
                size="small"
                onClick={() => setPermissionsDialogEmail(row.email)}
              />,
            )
          }
          if (canDelete) {
            actions.push(
              <GridActionsCellItem
                key="delete"
                icon={<Trash2 className="grid-action-icon icon-button--danger" />}
                label={t('config.deleteUser')}
                size="small"
                disabled={row.email === session?.email}
                onClick={() => setDeleteTarget(row)}
              />,
            )
          }
          return actions
        },
      })
    }

    base.push(
      { field: 'name', headerName: t('config.nameLabel'), flex: 1 },
      { field: 'email', headerName: t('auth.emailLabel'), flex: 1.2 },
      {
        field: 'phone',
        headerName: t('config.phoneLabel'),
        flex: 1,
        valueFormatter: (value) => formatPhoneForDisplay(value),
      },
      {
        field: 'role',
        headerName: t('auth.roleLabel'),
        flex: 1,
        valueFormatter: (value) => t(ROLE_LABEL_KEYS[value] ?? value),
      },
    )

    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAssign, canEdit, canDelete, session?.email, t])

  return (
    <div className="config-section">
      {canAdd && (
        <div className="config-section__title-row">
          <Button
            className="config-section__title-action"
            variant="contained"
            size="small"
            onClick={openAddUserDialog}
          >
            {t('config.addUser')}
          </Button>
        </div>
      )}

      {!canAdd && !canEdit && !canDelete && !canAssign && (
        <p className="config-section__notice">{t('config.viewOnlyNotice')}</p>
      )}

      {resetLink && (
        <div className="config-reset-link">
          <span className="config-reset-link__label">{t('config.resetLinkLabel')}</span>
          <code className="config-reset-link__value">{resetLink}</code>
          <button className="config-link-button" onClick={handleCopyResetLink}>
            {t(isCopied ? 'config.copied' : 'config.copyLink')}
          </button>
        </div>
      )}

      {loadError && <p className="config-section__notice">{loadError}</p>}

      {usersLoaded && (
        <div className="filter-bar">
          <div className="filter-bar__chips" role="group" aria-label={t('config.filterByRoleLabel')}>
            {availableRoles.map((r) => {
              const isActive = selectedRoles.has(r)
              return (
                <Chip
                  key={r}
                  label={t(ROLE_LABEL_KEYS[r] ?? r)}
                  size="small"
                  clickable
                  onClick={() => toggleRoleFilter(r)}
                  color={isActive ? 'primary' : 'default'}
                  variant={isActive ? 'filled' : 'outlined'}
                />
              )
            })}
          </div>
          <input
            type="search"
            className="form-field__input filter-bar__search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('config.searchUsersPlaceholder')}
            aria-label={t('config.searchUsersPlaceholder')}
          />
        </div>
      )}

      <DataGrid
        rows={filteredUsers}
        columns={columns}
        getRowId={(row) => row.email}
        disableRowSelectionOnClick
        autoHeight
        hideFooter={filteredUsers.length <= 100}
      />

      <Dialog open={Boolean(userFormTarget)} onClose={closeUserFormDialog}>
        <DialogTitle>{isEditMode ? editingUser?.name : t('config.addUser')}</DialogTitle>
        <DialogContent>
          <form
            id="user-form"
            className="auth-form config-add-form"
            onSubmit={handleSubmitUserForm}
            noValidate
          >
            <div className="form-field">
              <label className="form-field__label" htmlFor="user-email">
                {t('auth.emailLabel')}
              </label>
              <input
                id="user-email"
                className="form-field__input"
                type="email"
                value={form.email}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                  setFieldErrors((prev) => ({ ...prev, email: '' }))
                }}
                placeholder={t('config.emailPlaceholder')}
                autoComplete="off"
                disabled={isEditMode}
              />
              {fieldErrors.email && (
                <span className="form-field__error">{t('config.' + fieldErrors.email)}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-field__label" htmlFor="user-name">
                {t('config.nameLabel')}
              </label>
              <input
                id="user-name"
                className="form-field__input"
                type="text"
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                  setFieldErrors((prev) => ({ ...prev, name: '' }))
                }}
                placeholder={t('config.namePlaceholder')}
              />
              {fieldErrors.name && (
                <span className="form-field__error">{t('config.' + fieldErrors.name)}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-field__label" htmlFor="user-phone">
                {t('config.phoneLabel')}
              </label>
              <div className="phone-field">
                <span className="phone-field__prefix">+62</span>
                <input
                  id="user-phone"
                  className="phone-field__input"
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, phone: formatLocalPhoneDigits(event.target.value) }))
                    setFieldErrors((prev) => ({ ...prev, phone: '' }))
                  }}
                  placeholder={t('config.phonePlaceholder')}
                  autoComplete="off"
                />
              </div>
              {fieldErrors.phone && (
                <span className="form-field__error">{t('config.' + fieldErrors.phone)}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-field__label" htmlFor="user-role">
                {t('auth.roleLabel')}
              </label>
              <Autocomplete
                id="user-role"
                size="small"
                disableClearable
                autoHighlight
                options={roleOptions}
                value={form.role}
                getOptionLabel={(r) => t(ROLE_LABEL_KEYS[r] ?? r)}
                isOptionEqualToValue={(option, current) => option === current}
                onChange={(_event, newValue) =>
                  setForm((prev) => ({ ...prev, role: newValue ?? prev.role }))
                }
                renderInput={(params) => <TextField {...params} placeholder={t('auth.roleLabel')} />}
              />
            </div>

            {formError && (
              <span className="form-field__error">
                {userFormTarget === 'new' ? t('auth.' + formError) : formError}
              </span>
            )}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUserFormDialog}>{t('config.cancelEdit')}</Button>
          <Button type="submit" form="user-form" variant="contained" disabled={isSubmitting}>
            {t(isEditMode ? 'config.saveUser' : 'config.addUser')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('config.deleteUser')}</DialogTitle>
        <DialogContent>
          <p>{t('config.deleteUserConfirm').replace('%s', deleteTarget?.name ?? '')}</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('config.cancelEdit')}</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>
            {t('config.deleteUser')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(permissionsDialogUser)} onClose={closePermissionsDialog}>
        <DialogTitle>{permissionsDialogUser?.name}</DialogTitle>
        <DialogContent>
          <div className="permission-group-list">
            <PermissionCheckboxGroup
              titleKey="permissions.chatAccessSectionLabel"
              fields={CHAT_ACCESS_PERMISSIONS}
              dialogPermissions={dialogPermissions}
              isFieldLocked={isSuperadminLockedField}
              isFieldDisabled={isSelfEscalationBlocked}
              onToggle={(field) => handleTogglePermission(permissionsDialogEmail, field)}
              onToggleAll={(fields, next) => handleToggleAllPermissions(permissionsDialogEmail, fields, next)}
              t={t}
            />
            <PermissionCheckboxGroup
              titleKey="permissions.systemAccessSectionLabel"
              fields={SYSTEM_ACCESS_PERMISSIONS}
              dialogPermissions={dialogPermissions}
              isFieldLocked={isSuperadminLockedField}
              isFieldDisabled={isSelfEscalationBlocked}
              onToggle={(field) => handleTogglePermission(permissionsDialogEmail, field)}
              onToggleAll={(fields, next) => handleToggleAllPermissions(permissionsDialogEmail, fields, next)}
              t={t}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePermissionsDialog}>{t('config.cancelEdit')}</Button>
          <Button
            variant="contained"
            disabled={!isPermissionsDialogDirty}
            onClick={async () => {
              await handleSavePermissions(permissionsDialogEmail)
              setPermissionsDialogEmail(null)
            }}
          >
            {t('config.saveUser')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
