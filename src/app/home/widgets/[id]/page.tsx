import {notFound} from 'next/navigation';
import Link from 'next/link';
import {z} from 'zod';
import {portalContext} from '@/server/portal/data';
import {PageHead,Card,Badge,portalStyles as s} from '@/components/portal/ui';
import {WidgetForm} from '@/components/portal/widget-form';
import {EmbedCode} from '@/components/portal/embed-code';
export const metadata={title:'Component settings'};
export default async function WidgetPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const {supabase}=await portalContext();
 const {data:widget,error}=await supabase.from('embed_widgets').select('*,configurator_types(label)').eq('id',id).maybeSingle();
 if(error)throw new Error('Could not load the component.');if(!widget)notFound();
 const [views,quotes]=await Promise.all([supabase.from('widget_views').select('id',{count:'exact',head:true}).eq('widget_id',id),supabase.from('leads').select('id',{count:'exact',head:true}).eq('widget_id',id)]);
 if(views.error||quotes.error)throw new Error('Could not load component statistics.');
 return <><PageHead title={widget.name} note={`${widget.configurator_types.label} component · ${views.count||0} tracked sessions · ${quotes.count||0} enquiries`}><Badge state={widget.enabled?'active':'paused'}>{widget.enabled?'Live':'Paused'}</Badge></PageHead><div className={s.stack}><Link href="/home/widgets" className={s.link}>← All components</Link><div className={s.grid2}><Card title="Component settings" note="The product type stays fixed. Create a new component to switch products."><WidgetForm widget={widget}/></Card><Card title="Add to your website" note="Works in any website builder that accepts HTML."><EmbedCode publicKey={widget.public_key} name={widget.name}/></Card></div><Card title="Configurator preview" note="Try the live product options, inside/outside elevations, and enquiry flow before adding the component to your website."><Link href={`/embed/${widget.public_key}`} target="_blank" className={s.btn}>Open configurator</Link></Card></div></>;
}
