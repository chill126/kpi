import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSite } from '@/hooks/useSite'
import type { WhatIfScenario } from '@/types'

export function useWhatIfScenarios(): {
  scenarios: WhatIfScenario[]
  loading: boolean
} {
  const { siteId } = useSite()
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'whatIfScenarios', siteId, 'scenarios'),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setScenarios(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as WhatIfScenario)),
      )
      setLoading(false)
    })
    return unsub
  }, [siteId])

  return { scenarios, loading }
}
