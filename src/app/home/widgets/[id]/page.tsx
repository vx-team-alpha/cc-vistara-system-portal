import {notFound} from 'next/navigation';
import Link from 'next/link';
import {z} from 'zod';
import {getWidgetDetails} from '@/server/portal/data';
import {PageHead,Card,Badge,portalStyles as s} from '@/components/portal/ui';
import {WidgetForm} from '@/components/portal/widget-form';
import {EmbedCode} from '@/components/portal/embed-code';
export const metadata={title:'Component settings'};
export default async function WidgetPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const result=await getWidgetDetails(id);if(!result)notFound();
 const {widget,views,quotes}=result;
 return <><PageHead title={widget.name} note={`${widget.configurator_types.label} component · ${views} tracked sessions · ${quotes} quote ${quotes===1?'query':'queries'}`}><Badge state={widget.enabled?'active':'paused'}>{widget.enabled?'Live':'Paused'}</Badge></PageHead><div className={s.stack}><Link href="/home/widgets" className={s.link}>← All components</Link><div className={s.grid2}><Card title="Component settings" note="The product type stays fixed. Create a new component to switch products."><WidgetForm widget={widget}/></Card><Card title="Add to your website" note="Works in any website builder that accepts HTML."><EmbedCode publicKey={widget.public_key} name={widget.name}/></Card></div><Card title="Configurator preview" note="Try the live product options, inside/outside elevations, and enquiry flow before adding the component to your website."><Link href={`/embed/${widget.public_key}`} target="_blank" className={s.btn}>Open configurator</Link></Card></div></>;
}
