import { classifyMediaHttpFailure, type MediaCandidateSource, type MediaFailureSource } from './studioLogic';

export type MediaDiagnosticStage =
  | 'drive_upload_response'
  | 'firestore_metadata_saved'
  | 'frontend_media_received'
  | 'image_url_resolved'
  | 'browser_image_load'
  | 'browser_image_error';

export interface MediaProbeResult {
  status?: number;
  contentType?: string;
  source: MediaFailureSource;
  summary: string;
}

const probeCache = new Map<string, Promise<MediaProbeResult>>();

function isSafeDiagnosticEnabled(): boolean {
  return typeof console !== 'undefined';
}

export function logMediaDiagnostic(
  stage: MediaDiagnosticStage,
  details: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  if (!isSafeDiagnosticEnabled()) return;
  const payload = {
    stage,
    timestamp: new Date().toISOString(),
    ...details,
  };
  if (level === 'error') {
    console.error(`[SYAMS MEDIA] ${stage}`, payload);
  } else if (level === 'warn') {
    console.warn(`[SYAMS MEDIA] ${stage}`, payload);
  } else {
    console.info(`[SYAMS MEDIA] ${stage}`, payload);
  }
}

export function logImageCandidateAttempt(params: {
  driveFileId?: string;
  url: string;
  source: MediaCandidateSource;
  attemptIndex: number;
  totalCandidates: number;
  alt: string;
}): void {
  logMediaDiagnostic('image_url_resolved', {
    driveFileId: params.driveFileId || null,
    resolvedUrl: params.url,
    candidateSource: params.source,
    attempt: `${params.attemptIndex + 1}/${params.totalCandidates}`,
    alt: params.alt.slice(0, 80),
  });
}

/**
 * Probes a failed same-origin proxy URL (`/api/media/...`) without any credentials
 * so admin diagnostics can pinpoint 401/403/404/502/503/HTML fallback causes accurately.
 */
export async function probeFailedMediaProxyUrl(url: string): Promise<MediaProbeResult> {
  if (!url.startsWith('/api/media/')) {
    return classifyMediaHttpFailure({ url });
  }

  const cached = probeCache.get(url);
  if (cached) return cached;

  const task = (async (): Promise<MediaProbeResult> => {
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      const classification = classifyMediaHttpFailure({
        status: res.status,
        contentType,
        url,
      });
      return {
        status: res.status,
        contentType,
        source: classification.source,
        summary: classification.summary,
      };
    } catch {
      return {
        source: 'netlify_function',
        summary: 'Permintaan jaringan ke /api/media/ gagal sebelum menerima respons HTTP.',
      };
    }
  })();

  probeCache.set(url, task);
  return task;
}

export function clearMediaProbeCache(url?: string): void {
  if (url) {
    probeCache.delete(url);
  } else {
    probeCache.clear();
  }
}
