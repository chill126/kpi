export interface ShortcutHandlers {
  openPalette: () => void
  navigate: (to: string) => void
  openShortcutHelp: () => void
}

const chordRoutes: Record<string, string> = {
  o: '/',
  w: '/workload',
  e: '/enrollment',
  s: '/studies',
  i: '/investigators',
  d: '/deviations',
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

export function registerShortcuts(handlers: ShortcutHandlers): () => void {
  let chordPending = false
  let chordTimer: number | null = null

  const clearChord = () => {
    chordPending = false
    if (chordTimer !== null) { clearTimeout(chordTimer); chordTimer = null }
  }

  const handler = (e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey

    if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); handlers.openPalette(); return }
    if (meta && e.key === '/')                { e.preventDefault(); handlers.openShortcutHelp(); return }
    if (e.key === '?')                        { handlers.openShortcutHelp(); return }

    if (isEditable(document.activeElement)) return

    if (chordPending) {
      const route = chordRoutes[e.key.toLowerCase()]
      clearChord()
      if (route) { e.preventDefault(); handlers.navigate(route) }
      return
    }

    if (e.key.toLowerCase() === 'g' && !meta) {
      chordPending = true
      chordTimer = window.setTimeout(clearChord, 1000)
    }
  }

  window.addEventListener('keydown', handler)
  return () => { window.removeEventListener('keydown', handler); clearChord() }
}
