import Link from 'next/link';
import {getQuotes} from '@/server/portal/data';
import {PageHead,Card,portalStyles as s} from '@/components/portal/ui';
import {QuoteTable} from '@/components/portal/quote-table';
export const metadata={title:'Quote queries'};
const statuses=['all','new','viewed','contacted','closed'];
export default async function QuotesPage({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
 const query=await searchParams;const status=statuses.includes(query.status||'')?query.status!:'all';const page=Math.min(10000,Math.max(1,Math.floor(Number(query.page)||1)));
 const {data,count}=await getQuotes(status,page);
 return <><PageHead title="Quote queries" note="Every conversation starts with a product your customer has chosen."/><div className={s.toolbar}><nav className={s.tabs} aria-label="Filter queries by status">{statuses.map(v=><Link className={s.tab} href={`/home/quotes?status=${v}`} key={v} aria-current={status===v?'page':undefined}>{v==='all'?'All queries':v[0].toUpperCase()+v.slice(1)}</Link>)}</nav><span className={s.hint}>{count} {count===1?'query':'queries'}</span></div><Card title="Customer queries" flush><QuoteTable quotes={data}/></Card><nav className={s.actions} aria-label="Query pages">{page>1&&<Link className={s.btn} href={`/home/quotes?status=${status}&page=${page-1}`}>Previous</Link>}<span className={s.hint}>Page {page}</span>{page*20<count&&<Link className={s.btn} href={`/home/quotes?status=${status}&page=${page+1}`}>Next</Link>}</nav></>;
}
