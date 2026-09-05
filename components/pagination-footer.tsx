'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { describeRange, getPageWindow } from '@/lib/pagination';

export const DEFAULT_PAGE_SIZES = [10, 20, 50];

type PaginationFooterProps = {
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizes?: number[];
  disabled?: boolean;
  /** Plural noun for the range label, e.g. "patients". */
  noun?: string;
  className?: string;
};

/** "Showing X–Y of N" + per-page select + Prev / numbered / Next controls. Stacks below `sm`. */
export function PaginationFooter({
  page,
  pageSize,
  count,
  onPageChange,
  onPageSizeChange,
  pageSizes = DEFAULT_PAGE_SIZES,
  disabled = false,
  noun,
  className = '',
}: PaginationFooterProps) {
  const { from, to, pageCount } = describeRange(page, pageSize, count);
  const pageWindow = getPageWindow(page, pageCount);

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-4 sm:px-6 py-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>{count > 0 ? `Showing ${from}–${to} of ${count}${noun ? ` ${noun}` : ''}` : 'No results'}</span>
        <label className="flex items-center gap-1.5">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 border-slate-200"
            disabled={page <= 1 || disabled}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </Button>
          {pageWindow.map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="px-1 text-xs text-slate-400">…</span>
            ) : (
              <Button
                key={item}
                variant={item === page ? 'default' : 'outline'}
                size="sm"
                className={`h-8 min-w-8 px-2 text-xs ${item === page ? 'bg-navy-800 hover:bg-ink text-white border-0' : 'border-slate-200'}`}
                disabled={disabled}
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 border-slate-200"
            disabled={page >= pageCount || disabled}
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
