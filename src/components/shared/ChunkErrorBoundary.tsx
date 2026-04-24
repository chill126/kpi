import { Component, type ReactNode } from 'react'
import { captureError } from '@/lib/monitoring'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  retrying: boolean
}

const RELOAD_KEY = 'k2.chunk-reload-attempt'

function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const msg = String((error as { message?: string })?.message ?? error)
  return /Loading chunk|Failed to fetch dynamically imported module|ChunkLoadError/i.test(msg)
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, retrying: false }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, retrying: isChunkLoadError(error) }
  }

  componentDidCatch(error: unknown): void {
    captureError(error, { category: 'render', critical: false })
    // For chunk-load errors (stale index.html referencing old asset hashes after a
    // deploy), auto-reload once per session so the user doesn't have to click
    // Reload manually. The sessionStorage flag prevents infinite reload loops
    // if the error actually persists after a fresh index fetch.
    if (!isChunkLoadError(error)) return
    try {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1'
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
      }
    } catch {
      // sessionStorage unavailable; fall through to manual-reload UI below.
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 10,
          minHeight: 256, padding: '32px 24px', textAlign: 'center',
        }}>
          <p style={{
            margin: 0, fontSize: 14, color: 'var(--text-secondary)',
          }}>
            {this.state.retrying ? 'Reloading to fetch the latest version…' : 'Failed to load page.'}
          </p>
          {!this.state.retrying && (
            <button
              type="button"
              onClick={() => {
                try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* ignore */ }
                window.location.reload()
              }}
              className="hud-focus-ring"
              style={{
                padding: '8px 16px', borderRadius: 9999,
                background: 'rgba(255 255 255 / 0.06)',
                border: '1px solid rgba(255 255 255 / 0.12)',
                color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
                fontFamily: 'Inter, system-ui',
              }}
            >Reload</button>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
