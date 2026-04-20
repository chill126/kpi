import {
  collection,
  type CollectionReference,
  type DocumentData,
  query,
  where,
  type Query,
} from 'firebase/firestore'
import { db } from './firebase'

export function col(name: string): CollectionReference<DocumentData> {
  return collection(db, name)
}

export function withSite(
  collectionName: string,
  siteId: string,
): Query<DocumentData> {
  return query(col(collectionName), where('siteId', '==', siteId))
}

export function withSiteAndInvestigator(
  collectionName: string,
  siteId: string,
  investigatorId: string,
): Query<DocumentData> {
  return query(
    col(collectionName),
    where('siteId', '==', siteId),
    where('investigatorId', '==', investigatorId),
  )
}
