import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const K2_BOARD_APP_NAME = 'k2-board'

const k2BoardConfig = {
  apiKey: import.meta.env.VITE_K2_BOARD_API_KEY as string,
  authDomain: import.meta.env.VITE_K2_BOARD_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_K2_BOARD_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_K2_BOARD_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_K2_BOARD_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_K2_BOARD_APP_ID as string,
}

const existing = getApps().find((a) => a.name === K2_BOARD_APP_NAME)
const k2BoardApp = existing ?? initializeApp(k2BoardConfig, K2_BOARD_APP_NAME)

export const k2BoardDb = getFirestore(k2BoardApp)

const k2BoardAuth = getAuth(k2BoardApp)

// Singleton auth promise — anonymous sign-in is attempted once; reset on failure so the
// next caller retries rather than inheriting a permanently-rejected promise.
let authPromise: Promise<void> | null = null

export function ensureK2BoardAuth(): Promise<void> {
  if (!authPromise) {
    authPromise = signInAnonymously(k2BoardAuth)
      .then(() => undefined)
      .catch((err: unknown) => {
        authPromise = null
        throw err
      })
  }
  return authPromise
}
