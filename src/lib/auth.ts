import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { captureError, writeAuditLog } from './monitoring'
import type { AppUser, Role } from '@/types'

export async function signIn(email: string, password: string): Promise<void> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    writeAuditLog(cred.user.uid, cred.user.email ?? '', 'auth.sign_in').catch(console.error)
  } catch (err) {
    captureError(err, { category: 'auth', critical: true, context: { email } })
    writeAuditLog(null, email, 'auth.sign_in_failed', { meta: { error: String(err) } }).catch(console.error)
    throw err
  }
}

export async function signOut(): Promise<void> {
  const user = auth.currentUser
  await firebaseSignOut(auth)
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'auth.sign_out').catch(console.error)
  }
}

export async function getAppUser(user: User): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', user.uid))
  if (!snap.exists()) return null
  return { uid: user.uid, email: user.email ?? '', ...snap.data() } as AppUser
}

export async function createUserRecord(
  uid: string,
  email: string,
  displayName: string,
  role: Role,
  siteId: string,
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    email,
    displayName,
    role,
    siteId,
    assignedStudies: [],
  })
}
