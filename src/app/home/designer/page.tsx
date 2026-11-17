import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead, Card, Empty, portalStyles as s } from '@/components/portal/ui';
import { PublicEmbed } from '@/components/portal/public-embed';
import { getWidgets } from '@/server/portal/data';
import { loadEmbedCatalogue } from '@/server/portal/embed-products';

export const metadata: Metadata = { title: 'Designer' };

export default async function DesignerPage({
  searchParams,
}: {
  searchParams: Promise<{ widget?: string }>;
}) {
  const [widgets, query] = await Promise.all([getWidgets(), searchParams]);
  const live = widgets.filter((w) => w.enabled);
  const selected =
    live.find((w) => w.id === query.widget) || live[0] || null;

  if (!live.length) {
    return (
      <>
        <PageHead
          title="Designer"
          note="Try your door and window experiences here before sharing them on a website."
        />
        <Card title="No live components yet">
          <Empty
            title="Create a component to open the designer"
            action={
              <Link href="/home/widgets#create" className={s.btn}>
                Create component
              </Link>
            }
          >
            The designer uses one of your live embed components. Create a door or
            window component first, then return here to walk through the options.
          </Empty>
        </Card>
      </>
    );
  }

  const catalogue = await loadEmbedCatalogue(selected!.configurator_type_id);

  return (
    <>
      <PageHead
        title="Designer"
        note="Walk through product options for a live component. Enquiries you submit here still appear under Quote enquiries."
      />
      <div className={s.stack}>
        <div className={s.toolbar}>
          <nav className={s.tabs} aria-label="Choose a component">
            {live.map((w) => (
              <Link
                key={w.id}
                className={s.tab}
                href={`/home/designer?widget=${w.id}`}
                aria-current={selected!.id === w.id ? 'page' : undefined}
              >
                {w.name}
                <span className={s.hint}> · {w.configurator_types.label}</span>
              </Link>
            ))}
          </nav>
          {widgets.some((w) => !w.enabled) && (
            <span className={s.hint}>Paused components stay hidden here.</span>
          )}
        </div>
        <Card
          title={selected!.name}
          note={`${selected!.configurator_types.label} · Portal preview does not count as a tracked website session.`}
          flush
        >
          <div className={s.designerEmbed}>
            <PublicEmbed
              key={selected!.public_key}
              publicKey={selected!.public_key}
              name={selected!.name}
              ranges={catalogue.ranges}
              products={catalogue.products}
              trackViews={false}
              showHeader={false}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
