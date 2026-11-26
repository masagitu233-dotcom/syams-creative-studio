import { Link } from 'react-router-dom';
import { StudioImage } from './StudioImage';
import { formatRupiah } from '../utils/studioLogic';
import type { DigitalProductItem } from '../types/studio';

interface ProductCardProps {
  product: DigitalProductItem;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group nb-card-interactive overflow-hidden flex flex-col h-full">
      <Link
        to={`/produk/${product.slug}`}
        className="flex flex-col h-full focus-visible:outline-none"
        aria-label={`Lihat detail produk ${product.title}`}
      >
        <div className="border-b-2 border-[#171717] overflow-hidden shrink-0">
          <StudioImage
            src={product.imageUrl}
            alt={product.title}
            aspectClass="aspect-[16/10]"
            className="group-hover:scale-[1.03]"
          />
        </div>

        <div className="p-2 sm:p-2.5 flex flex-col flex-1 justify-between gap-1.5">
          <h3 className="font-display font-bold text-xs sm:text-[13px] text-[#171717] leading-snug line-clamp-2 min-h-[2rem] group-hover:text-[#0F3D3A] transition-colors">
            {product.title}
          </h3>

          {product.showPrice ? (
            <p className="font-mono font-bold text-xs sm:text-[13px] text-[#0F3D3A] tabular-nums leading-none pt-0.5">
              {formatRupiah(product.price)}
            </p>
          ) : (
            <p className="font-display font-semibold text-[11px] text-[#6C151E] leading-none pt-0.5">
              Lihat Detail
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
