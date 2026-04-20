import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { AppUser, Role } from '@/types'

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
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
