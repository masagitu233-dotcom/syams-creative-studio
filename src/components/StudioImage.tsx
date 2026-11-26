import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { buildMediaProxyUrl, sanitizeExternalUrl } from '../utils/studioLogic';

interface StudioImageProps {
  src?: string;
  driveFileId?: string;
  alt: string;
  className?: string;
  aspectClass?: string;
  fallbackLabel?: string;
  accentColor?: string;
  loading?: 'lazy' | 'eager';
}

export function StudioImage({
  src,
  driveFileId,
  alt,
  className = '',
  aspectClass = 'aspect-[4/3]',
  fallbackLabel,
  accentColor = '#0F3D3A',
  loading = 'lazy',
}: StudioImageProps) {
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedFallback, setFailedFallback] = useState(false);

  useEffect(() => {
    setFailedPrimary(false);
    setFailedFallback(false);
  }, [driveFileId, src]);

  const driveProxyUrl = driveFileId ? buildMediaProxyUrl(driveFileId, 'public') : '';
  const safeSrc = sanitizeExternalUrl(src);

  const resolvedSrc = !failedPrimary
    ? driveProxyUrl || safeSrc
    : driveProxyUrl && safeSrc && driveProxyUrl !== safeSrc && !failedFallback
      ? safeSrc
      : '';

  if (!resolvedSrc) {
    return (
      <div
        className={`${aspectClass} w-full flex flex-col items-center justify-center p-6 text-center bg-[#F1F1D3] border-b-2 border-[#171717] ${className}`}
        role="img"
        aria-label={alt}
      >
        <div
          className="w-12 h-12 border-2 border-[#171717] flex items-center justify-center mb-3 nb-shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          <ImageOff className="w-5 h-5 text-[#F8F8E1]" />
        </div>
        <p className="font-display font-semibold text-sm text-[#171717] max-w-[22ch]">
          {fallbackLabel || alt}
        </p>
        <p className="text-xs text-[#525252] mt-1">Ilustrasi SYAMS Creative Studio</p>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full overflow-hidden bg-[#F1F1D3] relative`}>
      <img
        src={resolvedSrc}
        alt={alt}
        loading={loading}
        referrerPolicy="no-referrer"
        onError={() => {
          if (!failedPrimary) {
            setFailedPrimary(true);
          } else {
            setFailedFallback(true);
          }
        }}
        className={`w-full h-full object-cover transition-transform duration-300 ease-out ${className}`}
      />
    </div>
  );
}
