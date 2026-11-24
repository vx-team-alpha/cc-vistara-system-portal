import s from "./portal.module.css";

function Block({ className = "" }: { className?: string }) {
  return <span className={`${s.skeleton} ${className}`} />;
}

function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className={s.skeletonPage}>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

function PageHeadSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className={s.skeletonPageHead}>
      <div className={s.skeletonCopy}>
        <Block className={s.skeletonTitle} />
        <Block className={s.skeletonNote} />
      </div>
      {action && <Block className={s.skeletonButton} />}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className={s.stats}>
      {Array.from({ length: 4 }, (_, i) => (
        <div className={s.stat} key={i}>
          <Block className={s.skeletonLabel} />
          <Block className={s.skeletonMetric} />
          <Block className={s.skeletonCaption} />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ rows = 3, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <section className={s.skeletonCard}>
      <header className={s.cardHead}>
        <div className={s.skeletonCopy}>
          <Block className={s.skeletonLabel} />
          <Block className={s.skeletonCaption} />
        </div>
      </header>
      <div className={`${s.skeletonCardBody} ${tall ? s.skeletonTall : ""}`}>
        {Array.from({ length: rows }, (_, i) => (
          <div className={s.skeletonRow} key={i}>
            <div className={s.skeletonCopy}>
              <Block className={s.skeletonLine} />
              <Block className={s.skeletonSubline} />
            </div>
            <Block className={s.skeletonPill} />
          </div>
        ))}
      </div>
    </section>
  );
}

function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <section className={s.skeletonCard}>
      <header className={s.cardHead}>
        <div className={s.skeletonCopy}>
          <Block className={s.skeletonLabel} />
          <Block className={s.skeletonCaption} />
        </div>
      </header>
      <div className={s.skeletonTable} data-columns={columns}>
        <div className={s.skeletonTableHead}>
          {Array.from({ length: columns }, (_, i) => (
            <Block className={s.skeletonTableLabel} key={i} />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div className={s.skeletonTableRow} key={row}>
            {Array.from({ length: columns }, (_, column) => (
              <Block className={column === 0 ? s.skeletonLine : s.skeletonCell} key={column} />
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
      <div className={s.stack}>
        <CardSkeleton rows={4} />
        <TableSkeleton rows={4} />
        <div className={s.grid2}>
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
      <div className={s.skeletonToolbar}>
        <Block className={s.skeletonTabs} />
        <Block className={s.skeletonCaption} />
      </div>
      <section className={s.skeletonCard}>
        <header className={s.cardHead}>
          <div className={s.skeletonCopy}>
            <Block className={s.skeletonLabel} />
            <Block className={s.skeletonCaption} />
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
      <div className={s.stack}>
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
      <Block className={s.skeletonBack} />
      <div className={s.grid2}>
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
      <div className={s.skeletonToolbar}>
        <Block className={s.skeletonTabs} />
        <Block className={s.skeletonCaption} />
      </div>
      <TableSkeleton rows={7} columns={5} />
    </LoadingRegion>
  );
}

export function QuoteDetailSkeleton() {
  return (
    <LoadingRegion label="Loading query details">
      <PageHeadSkeleton action />
      <Block className={s.skeletonBack} />
      <div className={s.grid2}>
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
      <div className={s.stack}>
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
      className={`${s.drawingSkeleton}`}
    >
      <span
        aria-hidden="true"
        className={`${s.skeleton} ${s.skeletonDrawing} -mt-20`}
        style={{ aspectRatio: `${widthMm} / ${heightMm}` }}
      />
    </div>
  );
}

export function ConfiguratorSkeleton() {
  return (
    <section
      className={s.configurator}
      role="status"
      aria-live="polite"
      aria-label="Loading product options"
    >
      <div className={s.elevationPanel} aria-hidden="true">
        <div className={s.toolbar}>
          <Block className={s.skeletonLabel} />
          <Block className={s.skeletonButton} />
        </div>
        <div className={s.elevation}>
          <DrawingSkeleton />
        </div>
        <Block className={s.skeletonLine} />
      </div>
      <div className={s.optionPanel} aria-hidden="true">
        <div className={s.toolbar}>
          <Block className={s.skeletonLabel} />
          <Block className={s.skeletonButton} />
        </div>
        <Block className={s.skeletonLabel} />
        <div className={s.optionList}>
          {Array.from({ length: 6 }, (_, i) => (
            <Block className={s.skeletonOption} key={i} />
          ))}
        </div>
        <div className={s.actions}>
          <Block className={s.skeletonButton} />
          <Block className={s.skeletonButton} />
        </div>
      </div>
    </section>
  );
}
