import { Skeleton } from '@/components/ui/skeleton';
import s from './portal.module.css';

export function WorkspaceSkeleton() {
  return (
    <div role="status" aria-label="Loading your workspace" className={s.stack}>
      <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-64 max-w-full" /></div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div aria-hidden="true" className={s.stats}>
        {Array.from({ length: 4 }, (_, i) => <div key={i} className={`${s.stat} space-y-4`}><Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-20" /><Skeleton className="h-3 w-32" /></div>)}
      </div>
      {[0, 1].map(section => <div key={section} aria-hidden="true" className="space-y-5 py-4">
        <Skeleton className="h-5 w-48" />
        {[0, 1, 2].map(row => <div key={row} className="flex items-center justify-between gap-4 py-3"><div className="w-2/3 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></div><Skeleton className="h-6 w-16" /></div>)}
      </div>)}
    </div>
  );
}

export function DrawingSkeleton() {
  return <div role="status" aria-label="Updating your design" className="flex h-full min-h-64 items-center justify-center p-6"><Skeleton aria-hidden="true" className="h-64 w-48 max-w-full sm:h-80" /></div>;
}

export function ConfiguratorSkeleton() {
  return (
    <section className={s.configurator} role="status" aria-label="Loading product options">
      <div className={s.elevationPanel} aria-hidden="true">
        <div className={s.toolbar}><Skeleton className="h-5 w-28" /><Skeleton className="h-9 w-28" /></div>
        <div className={s.elevation}><DrawingSkeleton /></div>
        <Skeleton className="mt-4 h-3 w-full" />
      </div>
      <div className={s.optionPanel} aria-hidden="true">
        <div className={s.toolbar}><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-40" /></div>
        <Skeleton className="mb-4 h-6 w-40" />
        <div className={s.optionList}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        <div className={s.actions}><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-28" /></div>
      </div>
    </section>
  );
}
