import Link from 'next/link';
import {portalContext} from '@/server/portal/data';
import {PageHead,Card,portalStyles as s} from '@/components/portal/ui';
import {QuoteTable} from '@/components/portal/quote-table';
export const metadata={title:'Quote enquiries'};
const statuses=['all','new','viewed','contacted','closed'];
export default async function QuotesPage({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
 const query=await searchParams;const status=statuses.includes(query.status||'')?query.status!:'all';const page=Math.min(10000,Math.max(1,Math.floor(Number(query.page)||1)));
 const {supabase}=await portalContext();let request=supabase.from('leads').select('id,name,email,status,created_at,embed_widgets(name)',{count:'exact'}).order('created_at',{ascending:false}).range((page-1)*20,page*20-1);
 if(status!=='all')request=request.eq('status',status);const {data,error,count}=await request;if(error)throw new Error('Could not load enquiries.');
 return <><PageHead title="Quote enquiries" note="Every conversation starts with a product your customer has chosen."/><div className={s.toolbar}><nav className={s.tabs} aria-label="Filter enquiries by status">{statuses.map(v=><Link className={s.tab} href={`/home/quotes?status=${v}`} key={v} aria-current={status===v?'page':undefined}>{v==='all'?'All enquiries':v[0].toUpperCase()+v.slice(1)}</Link>)}</nav><span className={s.hint}>{count||0} enquiries</span></div><Card title="Customer enquiries" flush><QuoteTable quotes={data||[]}/></Card><nav className={s.actions} aria-label="Enquiry pages">{page>1&&<Link className={s.btn} href={`/home/quotes?status=${status}&page=${page-1}`}>Previous</Link>}<span className={s.hint}>Page {page}</span>{page*20<(count||0)&&<Link className={s.btn} href={`/home/quotes?status=${status}&page=${page+1}`}>Next</Link>}</nav></>;
}
