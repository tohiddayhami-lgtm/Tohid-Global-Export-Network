import { doc, getFirestore, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseApp } from './firebase.ts';
import type { ExportNetworkJson } from './networkTypes.ts';

/** Single Firestore document for live multi-device sync */
export const EXPORT_NETWORK_DOC = { collection: 'exportNetwork', id: 'state' } as const;

export type NetworkSyncStatus = 'local_only' | 'connecting' | 'live' | 'error';

type Validate = (data: unknown) => data is ExportNetworkJson;

/**
 * Listens for remote changes and creates the document from local data if missing.
 * Call `onHydrated` once the first server round-trip finished so local writes can safely upload.
 */
export function subscribeExportNetworkFirestore(
  validateNetwork: Validate,
  callbacks: {
    getLatestNetwork: () => ExportNetworkJson;
    onApplyRemote: (next: ExportNetworkJson) => void;
    onHydrated: () => void;
    onStatus: (status: Exclude<NetworkSyncStatus, 'local_only'>, err?: Error) => void;
    onLastSyncedFingerprint: (json: string) => void;
  }
): () => void {
  if (!firebaseApp) {
    return () => {};
  }

  const { getLatestNetwork, onApplyRemote, onHydrated, onStatus, onLastSyncedFingerprint } = callbacks;
  const db = getFirestore(firebaseApp);
  const ref = doc(db, EXPORT_NETWORK_DOC.collection, EXPORT_NETWORK_DOC.id);

  let hydrated = false;
  const markHydrated = () => {
    if (!hydrated) {
      hydrated = true;
      onHydrated();
    }
  };

  onStatus('connecting');

  return onSnapshot(
    ref,
    (snapshot) => {
      void (async () => {
        try {
          if (!snapshot.exists()) {
            const seed = getLatestNetwork();
            await setDoc(ref, { network: seed, updatedAt: serverTimestamp() }, { merge: true });
            onLastSyncedFingerprint(JSON.stringify(seed));
            markHydrated();
            onStatus('live');
            return;
          }

          const raw: unknown = snapshot.data()?.network;
          if (!validateNetwork(raw)) {
            markHydrated();
            onStatus('live');
            return;
          }

          const incoming = JSON.stringify(raw);
          const local = JSON.stringify(getLatestNetwork());
          if (incoming !== local) {
            onLastSyncedFingerprint(incoming);
            onApplyRemote(raw);
          } else {
            onLastSyncedFingerprint(incoming);
          }
          markHydrated();
          onStatus('live');
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e));
          markHydrated();
          onStatus('error', err);
        }
      })();
    },
    (error) => {
      markHydrated();
      onStatus('error', error);
    }
  );
}

export async function pushExportNetworkDocument(network: ExportNetworkJson): Promise<void> {
  if (!firebaseApp) return;
  const db = getFirestore(firebaseApp);
  const ref = doc(db, EXPORT_NETWORK_DOC.collection, EXPORT_NETWORK_DOC.id);
  await setDoc(ref, { network, updatedAt: serverTimestamp() }, { merge: true });
}
