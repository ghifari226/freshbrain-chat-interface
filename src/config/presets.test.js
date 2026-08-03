import { describe, expect, it } from 'vitest'
import { ALL_PERMISSIONS } from './permissions.js'
import { PERMISSION_PRESETS, flagsForPreset, matchPresetForPermissions } from './presets.js'

describe('permission presets', () => {
  it('round-trips every preset through flagsForPreset -> matchPresetForPermissions', () => {
    for (const preset of PERMISSION_PRESETS) {
      expect(matchPresetForPermissions(flagsForPreset(preset.id))).toBe(preset.id)
    }
  })

  it('falls back to custom when nothing matches', () => {
    const flags = Object.fromEntries(ALL_PERMISSIONS.map((key) => [key, false]))
    flags['freshpedia.live_view'] = true
    flags['users.view'] = true
    expect(matchPresetForPermissions(flags)).toBe('custom')
  })

  it('superadmin preset grants every permission', () => {
    const flags = flagsForPreset('superadmin')
    expect(ALL_PERMISSIONS.every((key) => flags[key])).toBe(true)
  })

  it('admin-tech excludes user CRUD and day-to-day content editing', () => {
    const flags = flagsForPreset('admin-tech')
    expect(flags['users.add']).toBe(false)
    expect(flags['users.edit']).toBe(false)
    expect(flags['users.delete']).toBe(false)
    expect(flags['freshpedia.live_edit']).toBe(false)
    expect(flags['freshpedia.live_change_status']).toBe(false)
    expect(flags['freshpedia.request_add']).toBe(false)
    expect(flags['freshpedia.request_change_status']).toBe(false)
    expect(flags['tools.request_add']).toBe(false)
    expect(flags['tools.request_change_status']).toBe(false)
    expect(flags['users.view']).toBe(true)
    expect(flags['freshpedia.live_view']).toBe(true)
  })
})
