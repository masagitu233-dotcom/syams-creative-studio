import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { StudioImage } from './StudioImage';
import type { ServiceItem } from '../types/studio';

interface ServiceCardProps {
  service: ServiceItem;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="group nb-card-interactive overflow-hidden flex flex-col h-full">
      <Link
        to={`/layanan/${service.slug}`}
        className="block overflow-hidden border-b-2 border-[#171717] shrink-0"
        aria-label={`Lihat detail layanan ${service.title}`}
      >
        <StudioImage
          src={service.imageUrl}
          driveFileId={service.driveFileId}
          alt={service.title}
          accentColor={service.accentColor}
          aspectClass="aspect-[16/10]"
          className="group-hover:scale-[1.03]"
        />
      </Link>

      <div className="p-2 sm:p-2.5 flex flex-col flex-1 gap-2">
        <div className="space-y-1 flex-1 flex flex-col">
          <h3 className="font-display font-bold text-xs sm:text-[13px] text-[#171717] leading-snug line-clamp-2 min-h-[2rem]">
            <Link
              to={`/layanan/${service.slug}`}
              className="hover:text-[#0F3D3A] transition-colors"
            >
              {service.title}
            </Link>
          </h3>

          <p className="font-mono font-bold text-[11px] sm:text-xs text-[#0F3D3A] tabular-nums leading-snug line-clamp-2 min-h-[1.85rem] mt-auto pt-0.5">
            {service.priceLabel}
          </p>
        </div>

        <div className="pt-2 border-t border-[#171717]/15 grid grid-cols-2 gap-1.5 mt-auto">
          <Link
            to={`/layanan/${service.slug}`}
            className="nb-btn nb-btn-surface nb-btn-xs w-full"
          >
            Detail
          </Link>
          <Link
            to={`/checkout?service=${encodeURIComponent(service.slug)}`}
            className="nb-btn nb-btn-primary nb-btn-xs w-full"
          >
            Pesan
            <ArrowRight className="w-2.5 h-2.5 hidden sm:inline shrink-0" />
          </Link>
        </div>
      </div>
    </article>
  );
}
