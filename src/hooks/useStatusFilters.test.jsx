import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useStatusFilters } from './useStatusFilters.js'

const entries = [
  { id: 'production', status: 'production' },
  { id: 'staging', status: 'staging' },
  { id: 'request', status: 'request', requestStatus: 'posted' },
  { id: 'draft', status: 'request', requestStatus: 'draft' },
  // Promoted: status moved on to staging, but requestStatus stays frozen
  // at 'live' — should show in both Live (via status) and Request (via
  // requestStatus) tabs, since it's genuinely permanent history in both.
  { id: 'promoted', status: 'staging', requestStatus: 'live' },
]

describe('useStatusFilters', () => {
  it('shows production and staging by default while excluding requests', () => {
    const { result } = renderHook(() =>
      useStatusFilters({
        canViewProduction: true,
        canViewStaging: true,
        canViewRequest: true,
      }),
    )

    expect(result.current.isRequestActive).toBe(false)
    // 'promoted' has status='staging', so it's included here regardless of
    // its frozen requestStatus — the Live tab only ever looks at `status`.
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual([
      'production',
      'staging',
      'promoted',
    ])
  })

  it('narrows the Live tab to a single sub-status without touching the Request tab', () => {
    const { result } = renderHook(() =>
      useStatusFilters({
        canViewProduction: true,
        canViewStaging: true,
        canViewRequest: true,
      }),
    )

    act(() => result.current.toggleLiveStatus('production'))
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual(['production'])
    expect(result.current.isRequestActive).toBe(false)
  })

  it('switches to the Request tab exclusively from the Live sub-filter', () => {
    const { result } = renderHook(() =>
      useStatusFilters({
        canViewProduction: true,
        canViewStaging: true,
        canViewRequest: true,
      }),
    )

    act(() => result.current.toggleLiveStatus('production'))
    act(() => result.current.toggleTab('request'))
    expect(result.current.isRequestActive).toBe(true)
    // 'promoted' has requestStatus='live' (frozen, not unset), so it shows
    // here too as permanent history alongside the still-pending 'request'
    // (posted) and 'draft' entries.
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual([
      'request',
      'draft',
      'promoted',
    ])

    // Switching tabs clears the earlier sub-filter selection — back on
    // Live, all production+staging show again, not just 'production'.
    act(() => result.current.toggleTab('live'))
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual([
      'production',
      'staging',
      'promoted',
    ])
  })

  it('clears the Request sub-filter when switching tabs away and back', () => {
    const { result } = renderHook(() =>
      useStatusFilters({
        canViewProduction: true,
        canViewStaging: true,
        canViewRequest: true,
      }),
    )

    act(() => result.current.toggleTab('request'))
    act(() => result.current.toggleRequestStatus('draft'))
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual(['draft'])

    act(() => result.current.toggleTab('live'))
    act(() => result.current.toggleTab('request'))
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual([
      'request',
      'draft',
      'promoted',
    ])
  })

  it('narrows the Request tab to a single requestStatus sub-filter', () => {
    const { result } = renderHook(() =>
      useStatusFilters({
        canViewProduction: true,
        canViewStaging: true,
        canViewRequest: true,
      }),
    )

    act(() => result.current.toggleTab('request'))
    expect(result.current.availableRequestStatuses).toEqual(['live', 'posted', 'draft'])

    act(() => result.current.toggleRequestStatus('draft'))
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual(['draft'])

    act(() => result.current.toggleRequestStatus('draft'))
    act(() => result.current.toggleRequestStatus('live'))
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual(['promoted'])
  })

  it('starts request-only users on the Request tab, with no Live tab available', () => {
    const { result } = renderHook(() =>
      useStatusFilters({
        canViewProduction: false,
        canViewStaging: false,
        canViewRequest: true,
      }),
    )

    expect(result.current.isRequestActive).toBe(true)
    expect(result.current.availableTabs).toEqual(['request'])
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual([
      'request',
      'draft',
      'promoted',
    ])
  })
})
