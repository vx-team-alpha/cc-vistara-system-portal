import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="grid gap-5">
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}

function PageHeadSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-[31px] w-[180px]" />
        <Skeleton className="h-3.5 w-[min(420px,68vw)]" />
      </div>
      {action && <Skeleton className="h-9 w-[124px] rounded-md" />}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="mb-7 grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs" key={i}>
          <Skeleton className="h-3.5 w-[132px]" />
          <Skeleton className="mt-3 h-9 w-[84px]" />
          <Skeleton className="mt-2 h-3 w-[188px] max-w-full" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ rows = 3, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <header className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="grid gap-2">
          <Skeleton className="h-3.5 w-[132px]" />
          <Skeleton className="h-3 w-[188px] max-w-full" />
        </div>
      </header>
      <div className={cn("grid min-h-[132px] gap-3 p-5", tall && "min-h-[250px]")}>
        {Array.from({ length: rows }, (_, i) => (
          <div
            className="flex items-center justify-between gap-5 border-b border-border/60 py-3.5 last:border-b-0"
            key={i}
          >
            <div className="grid min-w-0 gap-2">
              <Skeleton className="h-3.5 w-[min(260px,64vw)]" />
              <Skeleton className="h-2.5 w-[min(190px,48vw)]" />
            </div>
            <Skeleton className="h-[22px] w-[62px] shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <header className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="grid gap-2">
          <Skeleton className="h-3.5 w-[132px]" />
          <Skeleton className="h-3 w-[188px] max-w-full" />
        </div>
      </header>
      <div className="min-w-[620px] overflow-x-auto">
        <div
          className="grid h-10 items-center gap-6 border-b border-border bg-muted/40 px-5"
          style={{
            gridTemplateColumns:
              columns === 3
                ? "minmax(180px, 1.5fr) repeat(2, minmax(100px, 1fr))"
                : columns === 5
                  ? "minmax(180px, 1.5fr) repeat(4, minmax(90px, 1fr))"
                  : "minmax(180px, 1.5fr) repeat(3, minmax(100px, 1fr))",
          }}
        >
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton className="h-2.5 w-[72px]" key={i} />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div
            className="grid h-[53px] items-center gap-6 border-b border-border/60 px-5 last:border-b-0"
            key={row}
            style={{
              gridTemplateColumns:
                columns === 3
                  ? "minmax(180px, 1.5fr) repeat(2, minmax(100px, 1fr))"
                  : columns === 5
                    ? "minmax(180px, 1.5fr) repeat(4, minmax(90px, 1fr))"
                    : "minmax(180px, 1.5fr) repeat(3, minmax(100px, 1fr))",
            }}
          >
            {Array.from({ length: columns }, (_, column) => (
              <Skeleton
                className={column === 0 ? "h-3.5 w-[min(260px,64vw)]" : "h-3 w-full max-w-[92px]"}
                key={column}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function OverviewSkeleton() {
  return (
    <LoadingRegion label="Loading overview">
      <PageHeadSkeleton action />
      <StatsSkeleton />
      <div className="grid gap-5">
        <CardSkeleton rows={4} />
        <TableSkeleton rows={4} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function DesignerPageSkeleton() {
  return (
    <LoadingRegion label="Loading designer">
      <PageHeadSkeleton />
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-[38px] w-[min(430px,72vw)] rounded-lg" />
        <Skeleton className="h-3 w-[188px] max-w-full" />
      </div>
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="grid gap-2">
            <Skeleton className="h-3.5 w-[132px]" />
            <Skeleton className="h-3 w-[188px] max-w-full" />
          </div>
        </header>
        <ConfiguratorSkeleton />
      </section>
    </LoadingRegion>
  );
}

export function WidgetsSkeleton() {
  return (
    <LoadingRegion label="Loading embed components">
      <PageHeadSkeleton />
      <div className="grid gap-5">
        <TableSkeleton rows={5} />
        <CardSkeleton rows={3} tall />
      </div>
    </LoadingRegion>
  );
}

export function WidgetDetailSkeleton() {
  return (
    <LoadingRegion label="Loading component settings">
      <PageHeadSkeleton action />
      <Skeleton className="mb-2 h-3.5 w-[108px]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CardSkeleton rows={4} tall />
        <CardSkeleton rows={3} tall />
      </div>
      <CardSkeleton rows={1} />
    </LoadingRegion>
  );
}

export function QuotesSkeleton() {
  return (
    <LoadingRegion label="Loading quote queries">
      <PageHeadSkeleton />
      <div className="mb-2 flex items-center justify-between gap-4">
        <Skeleton className="h-[38px] w-[min(430px,72vw)] rounded-lg" />
        <Skeleton className="h-3 w-[188px] max-w-full" />
      </div>
      <TableSkeleton rows={7} columns={5} />
    </LoadingRegion>
  );
}

export function QuoteDetailSkeleton() {
  return (
    <LoadingRegion label="Loading query details">
      <PageHeadSkeleton action />
      <Skeleton className="mb-2 h-3.5 w-[108px]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={2} />
      </div>
      <CardSkeleton rows={6} tall />
    </LoadingRegion>
  );
}

export function SettingsSkeleton() {
  return (
    <LoadingRegion label="Loading account settings">
      <div className="grid gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton rows={i === 3 ? 2 : 3} key={i} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function AdminOverviewSkeleton() {
  return (
    <LoadingRegion label="Loading admin overview">
      <PageHeadSkeleton action />
      <StatsSkeleton />
      <TableSkeleton rows={6} columns={3} />
    </LoadingRegion>
  );
}

export function AdminUsersSkeleton() {
  return (
    <LoadingRegion label="Loading users">
      <PageHeadSkeleton action />
      <TableSkeleton rows={8} columns={3} />
    </LoadingRegion>
  );
}

export const WorkspaceSkeleton = OverviewSkeleton;

export function DrawingSkeleton({
  widthMm = 900,
  heightMm = 2100,
}: {
  widthMm?: number;
  heightMm?: number;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Updating your design"
      className="grid h-full min-h-[256px] w-full place-items-center p-6"
    >
      <Skeleton
        aria-hidden="true"
        className="-mt-20 h-[min(88%,370px)] min-h-0 w-auto max-w-[70%] rounded-md"
        style={{ aspectRatio: `${widthMm} / ${heightMm}` }}
      />
    </div>
  );
}

export function ConfiguratorSkeleton() {
  return (
    <section
      className="mt-5 grid h-auto grid-cols-1 items-stretch gap-5 md:h-[min(720px,calc(100svh-160px))] md:max-h-[min(720px,calc(100svh-160px))] md:grid-cols-2"
      role="status"
      aria-live="polite"
      aria-label="Loading product options"
    >
      <div
        className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs"
        aria-hidden="true"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/60 pb-3">
          <Skeleton className="h-3.5 w-[132px]" />
          <Skeleton className="h-9 w-[124px] rounded-md" />
        </div>
        <div className="grid min-h-[300px] flex-1 place-items-center md:min-h-0">
          <DrawingSkeleton />
        </div>
        <Skeleton className="h-3.5 w-full max-w-[260px] shrink-0" />
      </div>
      <div
        className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs"
        aria-hidden="true"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/60 pb-3">
          <Skeleton className="h-3.5 w-[132px]" />
          <Skeleton className="h-9 w-[124px] rounded-md" />
        </div>
        <Skeleton className="my-3 h-3.5 w-[132px]" />
        <div className="mt-2 grid grid-cols-2 gap-2.5 p-1 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton className="h-32 rounded-xl" key={i} />
          ))}
        </div>
        <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-border/60 pt-3">
          <Skeleton className="h-9 w-[124px] rounded-md" />
          <Skeleton className="h-9 w-[124px] rounded-md" />
        </div>
      </div>
    </section>
  );
}
