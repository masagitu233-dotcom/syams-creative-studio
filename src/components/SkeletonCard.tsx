export function ServiceCardSkeleton() {
  return (
    <div className="nb-card overflow-hidden animate-pulse flex flex-col h-full" aria-hidden="true">
      <div className="aspect-[16/10] w-full bg-[#E5E5C7] border-b-2 border-[#171717]" />
      <div className="p-2 sm:p-2.5 space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="h-3.5 w-5/6 bg-[#D8D8B8]" />
          <div className="h-3 w-2/3 bg-[#E5E5C7]" />
        </div>
        <div className="h-3.5 w-24 bg-[#D8D8B8]" />
        <div className="pt-2 border-t border-[#171717]/15 grid grid-cols-2 gap-1.5">
          <div className="h-7 bg-[#E5E5C7] rounded-[4px]" />
          <div className="h-7 bg-[#D8D8B8] rounded-[4px]" />
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="nb-card overflow-hidden animate-pulse flex flex-col h-full" aria-hidden="true">
      <div className="aspect-[16/10] w-full bg-[#E5E5C7] border-b-2 border-[#171717]" />
      <div className="p-2 sm:p-2.5 space-y-1.5">
        <div className="h-3.5 w-5/6 bg-[#D8D8B8]" />
        <div className="h-3.5 w-1/2 bg-[#E5E5C7]" />
      </div>
    </div>
  );
}

export function PortfolioCardSkeleton() {
  return (
    <div className="nb-card overflow-hidden animate-pulse flex flex-col h-full" aria-hidden="true">
      <div className="aspect-[16/10] w-full bg-[#E5E5C7] border-b-2 border-[#171717]" />
      <div className="p-2 sm:p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="h-2.5 w-16 bg-[#E5E5C7]" />
          <div className="h-3.5 w-5/6 bg-[#D8D8B8]" />
        </div>
        <div className="pt-1.5 border-t border-[#171717]/15 flex items-center justify-between">
          <div className="h-3 w-16 bg-[#E5E5C7]" />
          <div className="h-3 w-3 bg-[#D8D8B8]" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b border-[#171717]/15 animate-pulse" aria-hidden="true">
      {Array.from({ length: columns }).map((_, idx) => (
        <td key={idx} className="px-3.5 py-2.5">
          <div className="h-3.5 bg-[#E5E5C7] w-3/4 rounded-[2px]" />
        </td>
      ))}
    </tr>
  );
}
