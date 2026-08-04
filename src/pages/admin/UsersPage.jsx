import { useEffect, useMemo, useState } from 'react'
import { Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Autocomplete,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
} from '@mui/material'
import { createUser, deleteUser, getAllUsers, updateUser } from '../../services/authService.js'
import { errorMessage, isCanceled } from '../../services/api.ts'
import { ROLES } from '../../config/roles.js'
import {
  ALL_PERMISSIONS,
  SYSTEM_ACCESS_PERMISSIONS,
  CHAT_ACCESS_PERMISSIONS,
  TECHNOLOGY_LOCKED_PERMISSIONS,
  canAssignPermissions,
  hasPermission,
  permissionsArrayToFlags,
  permissionFlagsToArray,
} from '../../config/permissions.js'
import { PERMISSION_PRESETS, flagsForPreset, matchPresetForPermissions } from '../../config/presets.js'
import { useT } from '../../hooks/useT.js'
import { useAuth } from '../../hooks/useAuth.js'
import GatewayJsonPreview from '../../components/devdoc/GatewayJsonPreview.jsx'
import PermissionCheckboxGroup from '../../components/admin/PermissionCheckboxGroup.jsx'
import {
  MIN_PHONE_DIGITS,
  digitsOnly,
  formatLocalPhoneDigits,
  formatPhoneForDisplay,
  localPhoneDigitsFromStored,
  phoneMatches,
  significantPhoneDigits,
} from './userPhone.js'

// Superuser is ROLES[0] but is never assignable through this form (see
// roleOptions below) — defaulting to it here would silently create a
// Superuser unless the admin happened to touch the Role field themselves.
const EMPTY_FORM = { name: '', email: '', phone: '', role: ROLES.find((r) => r !== 'Superuser') }

// Order-independent — see the identical concern in RolesPage's scopesEqual.
// Both args are flag-shaped ({ 'users.view': boolean, ... }), never the
// wire-shaped allowed_permissions array directly — see flagsForUser below.
function permissionsEqual(a, b) {
  return ALL_PERMISSIONS.every((field) => Boolean(a[field]) === Boolean(b[field]))
}

// Boundary helper: every directory-entry-shaped user object in this file
// (users state, permissionsDialogUser) carries `allowed_permissions` as an
// array (auth-contract.md's wire shape) — this dialog's checkbox grid still
// works in per-field flags internally, so every read of a `users` row for
// that purpose goes through here first.
function flagsForUser(user) {
  return permissionsArrayToFlags(user?.allowed_permissions)
}

// Same match-or-Custom logic as the Shield dialog's activePresetOption
// (below), just applied to a row's stored permissions instead of a draft —
// lets the table show which bundle a user's current permissions resolve to
// without opening the dialog.
function presetLabelForUser(user, t) {
  const presetId = matchPresetForPermissions(flagsForUser(user))
  const preset = PERMISSION_PRESETS.find((p) => p.id === presetId)
  return preset?.label ?? t('permissions.customPreset')
}

// The exact transform handleSubmitUserForm applies before sending `phone`
// to createUser/updateUser — factored out so the dev-doc live payload
// preview can never drift from what's actually submitted.
function wirePhone(localPart) {
  return localPart ? `62${significantPhoneDigits(localPart)}` : ''
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function UsersPage() {
  const t = useT()
  const { session, updateSession } = useAuth()
  const canAdd = hasPermission(session, 'users.add')
  const canEdit = hasPermission(session, 'users.edit')
  const canDelete = hasPermission(session, 'users.delete')
  const canAssign = canAssignPermissions(session)
  const actorForUpdate = useMemo(
    () => ({ id: session?.id, token: session?.token }),
    [session?.id, session?.token],
  )
  // Superuser is visible in the table (existing Superuser users show their
  // real role) but never assignable through this picker — bootstrap-locked,
  // not something granted via the UI, for anyone, regardless of the actor's
  // own permissions.
  const roleOptions = ROLES.filter((r) => r !== 'Superuser')

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
  // Add and Edit share one dialog/form: null (closed), 'new', or the id
  // of the row being edited — so both flows are the same UI/UX, not two
  // different code paths that could drift apart.
  const [userFormTarget, setUserFormTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [permissionsDialogUserId, setPermissionsDialogUserId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDirection, setSortDirection] = useState('asc')
  const [page, setPage] = useState(0)
  // Empty set = no role filter applied (show everyone). Chips are additive
  // (OR within roles), combined with searchQuery as AND.
  const [selectedRoles, setSelectedRoles] = useState(new Set())
  // Draft permission edits, keyed by user id — toggling a checkbox only ever
  // touches this, never the API. The upload/cancel icons inside the Shield
  // dialog's title (shown only while dirty) are the only things that either
  // commit this via updateUser or discard it — closing the dialog any other
  // way (backdrop, Escape, the Close button) also discards, so there's never
  // a silently-pending edit left behind once the dialog isn't open.
  const [pendingPermissions, setPendingPermissions] = useState({})
  const isEditMode = Boolean(userFormTarget) && userFormTarget !== 'new'
  const editingUser = isEditMode ? users.find((u) => u.id === userFormTarget) : null
  // Derived from `users`, not a snapshot, so the dialog's title/base data is
  // never stale.
  const permissionsDialogUser = users.find((u) => u.id === permissionsDialogUserId) ?? null
  const dialogPermissions = pendingPermissions[permissionsDialogUserId] ?? flagsForUser(permissionsDialogUser)
  const isPermissionsDialogDirty = permissionsDialogUser
    ? !permissionsEqual(dialogPermissions, flagsForUser(permissionsDialogUser))
    : false
  // dev-doc only — GET /users' 200 response (auth-contract.md). `users` is
  // already exactly that shape (it's what getAllUsers returned), no
  // reshaping needed.
  const gatewayUsersResponse = users

  // dev-doc only — POST /users' request body when adding, or PATCH
  // /users/{id}'s when editing an existing row (auth-contract.md) — the
  // Add/Edit dialog shares one form for both. wirePhone matches
  // handleSubmitUserForm's actual transform exactly, so this can never
  // silently drift from what's really sent.
  const gatewayUserFormPayload =
    userFormTarget === 'new'
      ? { name: form.name.trim(), email: form.email.trim(), phone: wirePhone(form.phone), role: form.role }
      : { name: form.name.trim(), phone: wirePhone(form.phone), role: form.role }

  // dev-doc only — PATCH /users/{id}'s request body for the Shield
  // dialog's save (auth-contract.md) — always a full allowed_permissions
  // replace, same as handleSavePermissions actually sends.
  const gatewayPermissionsPatchPayload = { allowed_permissions: permissionFlagsToArray(dialogPermissions) }

  // Highlights whichever preset's exact permission set matches the current
  // draft — never editable directly, purely derived from dialogPermissions
  // (see matchPresetForPermissions). Falls back to a synthetic "Custom"
  // entry (not a real PERMISSION_PRESETS member, so it can never be
  // selected from the dropdown itself) when nothing matches.
  const activePresetId = matchPresetForPermissions(dialogPermissions)
  const activePresetOption =
    PERMISSION_PRESETS.find((preset) => preset.id === activePresetId) ??
    { id: 'custom', label: t('permissions.customPreset') }

  // Mirrors updateUser's runtime guard for immediate feedback — the actor
  // can't check a box for a field they don't already hold themselves,
  // whether editing their own row or (structurally impossible here, since
  // the dialog can't even open on someone else without being Superuser or
  // Technology) anyone else's.
  function isSelfEscalationBlocked(field) {
    return permissionsDialogUserId === session?.id && !hasPermission(session, field)
  }

  // Mirrors updateUser's Technology-lock write guard for immediate
  // feedback — users.assign_permissions/users.view show checked+disabled
  // whenever the dialog's *target* (not the actor) is Technology. Superuser
  // gets no equivalent — its checkboxes are ordinary and freely toggleable.
  function isTechnologyLockedField(field) {
    return permissionsDialogUser?.role === 'Technology' && TECHNOLOGY_LOCKED_PERMISSIONS.includes(field)
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

  const sortedUsers = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1
    return [...filteredUsers].sort((left, right) =>
      String(left.name ?? '').localeCompare(String(right.name ?? ''), 'en', {
        sensitivity: 'base',
      }) * direction,
    )
  }, [filteredUsers, sortDirection])

  const rowsPerPage = 100
  const visibleUsers = sortedUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(filteredUsers.length / rowsPerPage) - 1)
    if (page > lastPage) setPage(lastPage)
  }, [filteredUsers.length, page])

  function handleNameSort() {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    setPage(0)
  }

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
  // usersLoaded means the filter bar and the table's real rows appear in the
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
    setUserFormTarget(row.id)
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
            phone: wirePhone(form.phone),
            role: form.role,
          },
          session,
        )
        setUsers((prev) => [...prev, user])
        setResetLink(`/reset/${resetToken}`)
        setIsCopied(false)
      } else {
        const id = userFormTarget
        const updated = await updateUser(
          id,
          { name: form.name.trim(), phone: wirePhone(form.phone), role: form.role },
          actorForUpdate,
        )
        setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
        // Only `name` is safe to patch live here — `updated` (from
        // toDirectoryEntry) doesn't carry allowed_scopes, so patching `role`
        // without it would leave the session's role and allowed_scopes
        // pointing at different roles until the next login.
        if (id === session?.id) updateSession({ name: updated.name })
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
    await deleteUser(deleteTarget.id, actorForUpdate)
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  function handleTogglePermission(userId, field) {
    setPendingPermissions((prev) => {
      const user = users.find((u) => u.id === userId)
      const current = prev[userId] ?? flagsForUser(user)
      return { ...prev, [userId]: { ...current, [field]: !current[field] } }
    })
  }

  function handleToggleAllPermissions(userId, fields, nextValue) {
    setPendingPermissions((prev) => {
      const user = users.find((u) => u.id === userId)
      const current = prev[userId] ?? flagsForUser(user)
      const next = { ...current }
      for (const field of fields) next[field] = nextValue
      return { ...prev, [userId]: next }
    })
  }

  function handleSelectPreset(userId, presetId) {
    setPendingPermissions((prev) => ({ ...prev, [userId]: flagsForPreset(presetId) }))
  }

  function discardPendingPermissions(userId) {
    setPendingPermissions((prev) => {
      const { [userId]: _discard, ...rest } = prev
      return rest
    })
  }

  // The only thing that actually calls updateUser for permissions — see
  // handleTogglePermission above, which only ever touches the local draft.
  // allowed_permissions is a full replace on the wire (auth-contract.md,
  // same convention as roles.allowed_scopes), so this always sends the
  // dialog's complete draft, not just the fields that changed — the diffing
  // now happens server-side (mock: authService.js's updateUser) against the
  // last-synced row.
  async function handleSavePermissions(userId) {
    const next = pendingPermissions[userId]
    if (!next) return
    const updated = await updateUser(userId, { allowed_permissions: permissionFlagsToArray(next) }, actorForUpdate)
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
    if (userId === session?.id) {
      updateSession({ allowed_permissions: updated.allowed_permissions })
    }
    discardPendingPermissions(userId)
  }

  function closePermissionsDialog() {
    if (permissionsDialogUserId) discardPendingPermissions(permissionsDialogUserId)
    setPermissionsDialogUserId(null)
  }

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
                  label={r}
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

      <TableContainer className="data-table-container">
        <Table className="data-table" size="small" aria-label={t('config.usersTitle')}>
          <TableHead>
            <TableRow>
              {(canAssign || canEdit || canDelete) && (
                <TableCell className="data-table__actions-cell" aria-label="Actions" />
              )}
              <TableCell sortDirection={sortDirection}>
                <TableSortLabel
                  active
                  direction={sortDirection}
                  onClick={handleNameSort}
                >
                  {t('config.nameLabel')}
                </TableSortLabel>
              </TableCell>
              <TableCell>{t('auth.emailLabel')}</TableCell>
              <TableCell>{t('config.phoneLabel')}</TableCell>
              <TableCell>{t('auth.roleLabel')}</TableCell>
              {canAssign && <TableCell>{t('config.adminPresetLabel')}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleUsers.map((row) => (
              <TableRow key={row.id} hover>
                {(canAssign || canEdit || canDelete) && (
                  <TableCell className="data-table__actions-cell">
                    <div className="data-table__actions">
                      {canEdit && (
                        <Tooltip title={t('config.editUser')}>
                          <IconButton size="small" onClick={() => openEditUserDialog(row)}>
                            <Pencil className="table-action-icon icon-button--edit" fill="currentColor" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canAssign && (
                        <Tooltip title={t('permissions.sectionLabel')}>
                          <IconButton size="small" onClick={() => setPermissionsDialogUserId(row.id)}>
                            <ShieldCheck className="table-action-icon" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title={t('config.deleteUser')}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={row.id === session?.id}
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className="table-action-icon icon-button--danger" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                )}
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{formatPhoneForDisplay(row.phone)}</TableCell>
                <TableCell>{row.role}</TableCell>
                {canAssign && <TableCell>{presetLabelForUser(row, t)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {filteredUsers.length > rowsPerPage && (
        <TablePagination
          component="div"
          count={filteredUsers.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          onPageChange={(_event, nextPage) => setPage(nextPage)}
        />
      )}

      <div className="config-devdoc">
        <GatewayJsonPreview title="GET /users — Response (live)" data={gatewayUsersResponse} />
      </div>

      <Dialog open={Boolean(userFormTarget)} onClose={closeUserFormDialog} fullWidth maxWidth="sm">
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
                getOptionLabel={(r) => r}
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
            <GatewayJsonPreview
              title={userFormTarget === 'new' ? 'POST /users — Payload (live)' : `PATCH /users/${userFormTarget} — Payload (live)`}
              data={gatewayUserFormPayload}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUserFormDialog}>{t('config.cancelEdit')}</Button>
          <Button type="submit" form="user-form" variant="contained" disabled={isSubmitting}>
            {t(isEditMode ? 'config.saveUser' : 'config.addUser')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('config.deleteUser')}</DialogTitle>
        <DialogContent>
          <p>{t('config.deleteUserConfirm').replace('%s', deleteTarget?.name ?? '')}</p>
          {/* dev-doc only — DELETE has no request body, so just the endpoint+id, no JSON. */}
          <div className="gateway-json-preview">
            <div className="gateway-json-preview__title">{`DELETE /users/${deleteTarget?.id ?? '{id}'}`}</div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('config.cancelEdit')}</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>
            {t('config.deleteUser')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(permissionsDialogUser)} onClose={closePermissionsDialog} fullWidth maxWidth="sm">
        <DialogTitle>{permissionsDialogUser?.name}</DialogTitle>
        <DialogContent>
          <div className="form-field">
            <label className="form-field__label" htmlFor="permission-preset">
              {t('permissions.presetLabel')}
            </label>
            <Autocomplete
              id="permission-preset"
              size="small"
              disableClearable
              autoHighlight
              options={PERMISSION_PRESETS}
              value={activePresetOption}
              getOptionLabel={(preset) => preset.label}
              isOptionEqualToValue={(option, current) => option.id === current.id}
              onChange={(_event, newValue) => {
                if (newValue) handleSelectPreset(permissionsDialogUserId, newValue.id)
              }}
              renderInput={(params) => <TextField {...params} placeholder={t('permissions.presetLabel')} />}
            />
          </div>
          <div className="permission-group-list">
            <PermissionCheckboxGroup
              titleKey="permissions.chatAccessSectionLabel"
              fields={CHAT_ACCESS_PERMISSIONS}
              permissions={dialogPermissions}
              isFieldLocked={isTechnologyLockedField}
              isFieldDisabled={isSelfEscalationBlocked}
              onToggle={(field) => handleTogglePermission(permissionsDialogUserId, field)}
              onToggleAll={(fields, next) => handleToggleAllPermissions(permissionsDialogUserId, fields, next)}
              t={t}
            />
            <PermissionCheckboxGroup
              titleKey="permissions.systemAccessSectionLabel"
              fields={SYSTEM_ACCESS_PERMISSIONS}
              permissions={dialogPermissions}
              isFieldLocked={isTechnologyLockedField}
              isFieldDisabled={isSelfEscalationBlocked}
              onToggle={(field) => handleTogglePermission(permissionsDialogUserId, field)}
              onToggleAll={(fields, next) => handleToggleAllPermissions(permissionsDialogUserId, fields, next)}
              t={t}
            />
          </div>
          <GatewayJsonPreview
            title={`PATCH /users/${permissionsDialogUserId ?? '{id}'} — Payload (live)`}
            data={gatewayPermissionsPatchPayload}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closePermissionsDialog}>{t('config.cancelEdit')}</Button>
          <Button
            variant="contained"
            disabled={!isPermissionsDialogDirty}
            onClick={async () => {
              await handleSavePermissions(permissionsDialogUserId)
              setPermissionsDialogUserId(null)
            }}
          >
            {t('config.saveUser')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
