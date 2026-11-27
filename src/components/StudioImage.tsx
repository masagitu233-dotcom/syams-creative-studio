import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ImageOff } from 'lucide-react';
import {
  buildMediaImageCandidates,
  extractDriveFileId,
} from '../utils/studioLogic';
import {
  logImageCandidateAttempt,
  logMediaDiagnostic,
  probeFailedMediaProxyUrl,
  type MediaProbeResult,
} from '../utils/mediaDiagnostics';
import type { MediaVisibility } from '../types/studio';

export interface StudioImageProps {
  src?: string;
  driveFileId?: string;
  visibility?: MediaVisibility;
  alt: string;
  className?: string;
  aspectClass?: string;
  fit?: 'cover' | 'contain';
  fallbackLabel?: string;
  accentColor?: string;
  loading?: 'lazy' | 'eager';
  allowSrcFallback?: boolean;
  showErrorDetails?: boolean;
  retryKey?: number;
  cacheVersion?: unknown;
  onStatusChange?: (
    status: 'loading' | 'loaded' | 'error',
    info?: { url?: string; errorSummary?: string; failureSource?: string }
  ) => void;
}

export function StudioImage({
  src,
  driveFileId,
  visibility = 'public',
  alt,
  className = '',
  aspectClass = 'aspect-[4/3]',
  fit = 'cover',
  fallbackLabel,
  accentColor = '#0F3D3A',
  loading = 'lazy',
  allowSrcFallback = true,
  showErrorDetails = false,
  retryKey = 0,
  cacheVersion,
  onStatusChange,
}: StudioImageProps) {
  const candidates = useMemo(
    () =>
      buildMediaImageCandidates({
        driveFileId,
        src,
        visibility,
        allowSrcFallback,
        cacheVersion,
      }),
    [driveFileId, src, visibility, allowSrcFallback, cacheVersion]
  );

  const effectiveDriveId = useMemo(
    () => (driveFileId || '').trim() || extractDriveFileId(src),
    [driveFileId, src]
  );

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [probeResult, setProbeResult] = useState<MediaProbeResult | null>(null);

  useEffect(() => {
    setCandidateIndex(0);
    setProbeResult(null);
  }, [driveFileId, src, visibility, allowSrcFallback, retryKey, cacheVersion]);

  const activeCandidate = candidates[candidateIndex] || null;

  useEffect(() => {
    if (!activeCandidate) {
      onStatusChange?.('error', {
        errorSummary: probeResult?.summary || 'Sumber gambar tidak tersedia.',
        failureSource: probeResult?.source || 'image_url',
      });
      return;
    }

    onStatusChange?.('loading', { url: activeCandidate.url });
    if (effectiveDriveId || activeCandidate.source !== 'src_fallback') {
      logImageCandidateAttempt({
        driveFileId: effectiveDriveId,
        url: activeCandidate.url,
        source: activeCandidate.source,
        attemptIndex: candidateIndex,
        totalCandidates: candidates.length,
        alt,
      });
    }
  }, [activeCandidate, candidateIndex, candidates.length, effectiveDriveId, alt, probeResult, onStatusChange]);

  if (!activeCandidate) {
    return (
      <div
        className={`${aspectClass} w-full flex flex-col items-center justify-center p-4 text-center bg-[#F1F1D3] border-b-2 border-[#171717] ${className}`}
        role="img"
        aria-label={alt}
      >
        <div
          className="w-10 h-10 border-2 border-[#171717] flex items-center justify-center mb-2 nb-shadow-sm"
          style={{ backgroundColor: showErrorDetails ? '#6C151E' : accentColor }}
        >
          {showErrorDetails ? (
            <AlertTriangle className="w-4 h-4 text-[#F8F8E1]" />
          ) : (
            <ImageOff className="w-4 h-4 text-[#F8F8E1]" />
          )}
        </div>
        <p className="font-display font-semibold text-xs sm:text-sm text-[#171717] max-w-[26ch] line-clamp-2">
          {showErrorDetails
            ? 'Gambar gagal dimuat'
            : fallbackLabel || alt}
        </p>
        <p className="text-[11px] text-[#525252] mt-1 max-w-[30ch] line-clamp-2">
          {showErrorDetails
            ? probeResult?.summary || 'Media Google Drive tidak dapat diakses.'
            : 'Ilustrasi SYAMS Creative Studio'}
        </p>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full overflow-hidden bg-[#F1F1D3] relative flex items-center justify-center`}>
      <img
        key={`${activeCandidate.url}::${retryKey}`}
        src={activeCandidate.url}
        alt={alt}
        loading={loading}
        referrerPolicy="no-referrer"
        onLoad={(ev) => {
          const img = ev.currentTarget;
          if (effectiveDriveId || activeCandidate.source !== 'src_fallback') {
            logMediaDiagnostic('browser_image_load', {
              driveFileId: effectiveDriveId || null,
              loadedUrl: activeCandidate.url,
              candidateSource: activeCandidate.source,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
            });
          }
          onStatusChange?.('loaded', { url: activeCandidate.url });
        }}
        onError={() => {
          const failedUrl = activeCandidate.url;
          const failedSource = activeCandidate.source;
          const hasNext = candidateIndex + 1 < candidates.length;

          if (failedUrl.startsWith('/api/media/')) {
            void probeFailedMediaProxyUrl(failedUrl).then((probe) => {
              setProbeResult(probe);
              logMediaDiagnostic(
                'browser_image_error',
                {
                  driveFileId: effectiveDriveId || null,
                  failedUrl,
                  candidateSource: failedSource,
                  httpStatus: probe.status ?? null,
                  responseContentType: probe.contentType || null,
                  failureSource: probe.source,
                  summary: probe.summary,
                  fallbackAvailable: hasNext,
                },
                'warn'
              );
            });
          } else {
            logMediaDiagnostic(
              'browser_image_error',
              {
                driveFileId: effectiveDriveId || null,
                failedUrl,
                candidateSource: failedSource,
                fallbackAvailable: hasNext,
              },
              'warn'
            );
          }

          setCandidateIndex((prev) => prev + 1);
        }}
        className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} transition-transform duration-300 ease-out ${className}`}
      />
    </div>
  );
}
