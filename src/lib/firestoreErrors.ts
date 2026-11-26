import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function formatUserFriendlyError(error: unknown, fallbackMessage: string): string {
  if (!error) return fallbackMessage;
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('permission-denied') || raw.includes('Missing or insufficient permissions')) {
    return 'Akses ditolak oleh aturan keamanan database. Pastikan Anda masuk dengan akun yang berwenang.';
  }
  if (raw.includes('Quota exceeded')) {
    return 'Batas kuota harian Firestore tercapai. Silakan coba kembali esok hari atau periksa kuota proyek Firebase.';
  }
  if (raw.includes('popup-closed-by-user')) {
    return 'Jendela login Google ditutup sebelum proses selesai. Silakan coba lagi.';
  }
  if (raw.includes('network-request-failed') || raw.includes('the client is offline')) {
    return 'Koneksi internet terganggu atau Firestore sedang offline. Periksa jaringan Anda lalu coba ulang.';
  }
  return fallbackMessage;
}
