import { describe, it, expect, vi, afterEach } from 'vitest'
import { registerShortcuts, type ShortcutHandlers } from './keyboardShortcuts'

const fire = (key: string, meta = false) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, metaKey: meta, ctrlKey: meta, bubbles: true }))
}

describe('keyboardShortcuts', () => {
  let cleanup: (() => void) | null = null
  afterEach(() => { cleanup?.(); cleanup = null })

  it('triggers openPalette on Cmd/Ctrl+K', () => {
    const handlers: ShortcutHandlers = { openPalette: vi.fn(), navigate: vi.fn(), openShortcutHelp: vi.fn() }
    cleanup = registerShortcuts(handlers)
    fire('k', true)
    expect(handlers.openPalette).toHaveBeenCalledOnce()
  })
  it('supports g-chord navigation to /overview via g o', () => {
    const handlers: ShortcutHandlers = { openPalette: vi.fn(), navigate: vi.fn(), openShortcutHelp: vi.fn() }
    cleanup = registerShortcuts(handlers)
    fire('g'); fire('o')
    expect(handlers.navigate).toHaveBeenCalledWith('/')
  })
  it('ignores g-chord while focus is inside an input', () => {
    const input = document.createElement('input')
    document.body.appendChild(input); input.focus()
    const handlers: ShortcutHandlers = { openPalette: vi.fn(), navigate: vi.fn(), openShortcutHelp: vi.fn() }
    cleanup = registerShortcuts(handlers)
    fire('g'); fire('o')
    expect(handlers.navigate).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })
})
