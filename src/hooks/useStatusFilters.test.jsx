import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useStatusFilters } from './useStatusFilters.js'

const entries = [
  { id: 'production', status: 'production' },
  { id: 'staging', status: 'staging' },
  { id: 'request', status: 'request' },
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

    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual([
      'production',
      'staging',
    ])
  })

  it('switches request mode exclusively from normal status filters', () => {
    const { result } = renderHook(() =>
      useStatusFilters({
        canViewProduction: true,
        canViewStaging: true,
        canViewRequest: true,
      }),
    )

    act(() => result.current.toggleStatus('production'))
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual(['production'])

    act(() => result.current.toggleStatus('request'))
    expect(result.current.isRequestActive).toBe(true)
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual(['request'])
  })

  it('starts request-only users in request mode', () => {
    const { result } = renderHook(() =>
      useStatusFilters({
        canViewProduction: false,
        canViewStaging: false,
        canViewRequest: true,
      }),
    )

    expect(result.current.isRequestActive).toBe(true)
    expect(result.current.filterByStatus(entries).map((entry) => entry.id)).toEqual(['request'])
  })
})
