import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHead,Card,Badge,Empty,portalStyles as s,formatDate} from '@/components/portal/ui';
import {WidgetForm} from '@/components/portal/widget-form';
import {getWidgets} from '@/server/portal/data';
export const metadata:Metadata={title:'Embed components'};
export default async function WidgetsPage({searchParams}:{searchParams:Promise<{type?:string}>}){
 const [widgets,query]=await Promise.all([getWidgets(),searchParams]);
 return <><PageHead title="Embed components" note="Create dedicated door and window experiences for your websites."/><div className={s.stack}><Card title="Your components" note={`${widgets.length} components in your account`} flush>{!widgets.length?<Empty title="A home for your configurators">Create your first component below. Each one gets a separate public link and embed code.</Empty>:<div className={s.tableScroll}><table className={s.table}><thead><tr><th>Name / website</th><th>Product</th><th>Availability</th><th>Created</th></tr></thead><tbody>{widgets.map(w=><tr key={w.id} className={s.clickableTableRow}><td><Link className={s.tableRowLink} href={`/home/widgets/${w.id}`}>{w.name}</Link><small>{w.website_url||'No website added'}</small></td><td>{w.configurator_types.label}</td><td><Badge state={w.enabled?'active':'paused'}>{w.enabled?'Live':'Paused'}</Badge></td><td>{formatDate(w.created_at)}</td></tr>)}</tbody></table></div>}</Card><section id="create"><Card title="Create a component" note="Choose doors or windows. You can create multiple components for different websites."><WidgetForm initialType={query.type==='window'?'window':'door'}/></Card></section></div></>;
}
