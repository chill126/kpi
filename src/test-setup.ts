import '@testing-library/jest-dom'

/**
 * jsdom polyfills for libraries that rely on browser-only APIs at module load.
 *
 * cmdk (CommandPalette) and @radix-ui/react-dropdown-menu (UserChip) both
 * construct ResizeObserver unconditionally on mount and call scrollIntoView
 * on focus transitions; jsdom ships neither. These are no-op stubs — they
 * keep the components from throwing in tests but do NOT faithfully dispatch
 * size-change callbacks. If a future component depends on ResizeObserver
 * callbacks for real behavior (e.g. virtualized lists, auto-sizing charts),
 * replace this with a faithful polyfill such as `resize-observer-polyfill`.
 */
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = function () {}
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList)
}
