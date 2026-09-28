"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

/** Client-side paging over a list. The page is clamped if the list shrinks. */
export function usePagination<T>(items: T[], pageSize: number) {
  const [requested, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requested, pageCount - 1);
  return {
    page,
    pageCount,
    setPage,
    pageItems: items.slice(page * pageSize, (page + 1) * pageSize),
    from: items.length ? page * pageSize + 1 : 0,
    to: Math.min(items.length, (page + 1) * pageSize),
    total: items.length,
  };
}

type PagerProps = Pick<ReturnType<typeof usePagination>, "page" | "pageCount" | "setPage" | "from" | "to" | "total"> & {
  /** What is being paged, for labels, e.g. "projects". */
  noun: string;
  /** Compact single-row layout for section headers ("1–6 of 9" beside the buttons). */
  compact?: boolean;
  className?: string;
};

/** Prev / page dots / Next. Renders nothing when everything fits on one page. */
export function Pager({ page, pageCount, setPage, from, to, total, noun, compact = false, className = "" }: PagerProps) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label={`${noun} pages`}
      className={`flex flex-wrap items-center gap-3 ${compact ? "justify-end" : "justify-between"} ${className}`}
    >
      <span className="text-xs text-slate-500">
        {compact ? (
          <>
            <b className="text-slate-700">{from}–{to}</b> of <b className="text-slate-700">{total}</b>
          </>
        ) : (
          <>
            Showing <b className="text-slate-700">{from}–{to}</b> of <b className="text-slate-700">{total}</b> {noun}
          </>
        )}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="small"
          variant="outlined"
          startIcon={<ChevronLeftIcon />}
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
          aria-label={`Previous ${noun}`}
        >
          Prev
        </Button>
        <div className="flex items-center gap-1.5 px-1">
          {Array.from({ length: pageCount }, (_, i) => (
            <Tooltip key={i} title={`Page ${i + 1}`}>
              <button
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Page ${i + 1}`}
                aria-current={i === page ? "page" : undefined}
                className={`h-2 rounded-full transition-all ${i === page ? "w-5 bg-sky-500" : "w-2 bg-slate-300 hover:bg-slate-400"}`}
              />
            </Tooltip>
          ))}
        </div>
        <Button
          size="small"
          variant="contained"
          endIcon={<ChevronRightIcon />}
          disabled={page === pageCount - 1}
          onClick={() => setPage(page + 1)}
          aria-label={`Next ${noun}`}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
