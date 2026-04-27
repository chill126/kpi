import { useCallback, useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { subscribeUser, updateUser } from '@/lib/users'
import type { DashboardConfig, OverviewTileId } from '@/types'

export const ALL_TILE_IDS: OverviewTileId[] = [
  'studies',
  'enrollment',
  'today-activity',
]

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  tiles: ALL_TILE_IDS.map((id, i) => ({ id, visible: true, order: i })),
}

export function mergeDashboardConfig(stored: DashboardConfig): DashboardConfig {
  if (!Array.isArray(stored.tiles)) return DEFAULT_DASHBOARD_CONFIG
  const knownStored = stored.tiles.filter(
    (t) => (ALL_TILE_IDS as string[]).includes(t.id),
  )
  const storedIds = new Set(knownStored.map((t) => t.id))
  const maxOrder = knownStored.reduce((m, t) => Math.max(m, t.order), -1)
  const missing = ALL_TILE_IDS
    .filter((id) => !storedIds.has(id))
    .map((id, i) => ({ id, visible: true, order: maxOrder + 1 + i }))
  return { tiles: [...knownStored, ...missing] }
}

export function useDashboardConfig(): {
  config: DashboardConfig
  saveConfig: (c: DashboardConfig) => Promise<void>
} {
  const { user } = useAuthContext()
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG)

  useEffect(() => {
    if (!user?.uid) {
      setConfig(DEFAULT_DASHBOARD_CONFIG)
      return
    }
    return subscribeUser(
      user.uid,
      (u) =>
        setConfig(
          u?.dashboardConfig
            ? mergeDashboardConfig(u.dashboardConfig)
            : DEFAULT_DASHBOARD_CONFIG,
        ),
      (err) => {
        console.error('[useDashboardConfig] subscription error:', err)
        setConfig(DEFAULT_DASHBOARD_CONFIG)
      },
    )
  }, [user?.uid])

  const saveConfig = useCallback(
    async (c: DashboardConfig): Promise<void> => {
      if (!user?.uid) return
      await updateUser(user.uid, { dashboardConfig: c })
    },
    [user?.uid],
  )

  return { config, saveConfig }
}
