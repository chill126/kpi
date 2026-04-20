import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SiteProvider } from '@/context/SiteContext'
import { useSite } from '@/hooks/useSite'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SiteProvider initialSiteId="tampa">{children}</SiteProvider>
)

describe('useSite', () => {
  it('returns the initial siteId', () => {
    const { result } = renderHook(() => useSite(), { wrapper })
    expect(result.current.siteId).toBe('tampa')
  })

  it('updates siteId when setActiveSite is called', () => {
    const { result } = renderHook(() => useSite(), { wrapper })

    act(() => {
      result.current.setActiveSite('winter-garden')
    })

    expect(result.current.siteId).toBe('winter-garden')
  })
})
