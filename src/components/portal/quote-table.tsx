import Link from 'next/link';
import {Badge, Empty, formatDate} from './ui';
import s from './portal.module.css';
type Quote={id:string;name:string|null;email:string|null;status:string;created_at:string;embed_widgets:{name:string}|null};
export function QuoteTable({quotes}:{quotes:Quote[]}){
 if(!quotes.length)return <Empty title="No quote enquiries yet">When a visitor sends an enquiry from one of your components, it will appear here with their contact details and chosen product.</Empty>;
 return <div className={s.tableScroll}><table className={s.table}><thead><tr><th>Customer</th><th>Component</th><th>Status</th><th>Received</th></tr></thead><tbody>{quotes.map(q=><tr key={q.id}><td><Link href={`/home/quotes/${q.id}`}>{q.name||'Unnamed customer'}</Link><small>{q.email||'No email address'}</small></td><td>{q.embed_widgets?.name||'Direct enquiry'}</td><td><Badge state={q.status}>{q.status}</Badge></td><td>{formatDate(q.created_at)}</td></tr>)}</tbody></table></div>;
}
