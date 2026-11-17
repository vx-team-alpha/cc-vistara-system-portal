'use client';
import {useState,useTransition} from 'react';
import {updateQuoteStatus} from '@/server/portal/actions';
import {QuoteStatusSchema} from '@/server/portal/schemas';
import s from './portal.module.css';
export function QuoteStatus({id,status}:{id:string;status:string}){
 const [pending,start]=useTransition(); const [message,setMessage]=useState('');
 return <form action={form=>{const parsed=QuoteStatusSchema.safeParse({id,status:form.get('status')});if(!parsed.success){setMessage('Choose a valid status.');return;} start(async()=>{try{const result=await updateQuoteStatus(parsed.data);setMessage(result.ok?'Status updated.':result.error);}catch{setMessage('Could not update the status. Please try again.');}});}}><label className={s.label} htmlFor="quote-status">Query status</label><div className={s.actions}><select className={s.select} id="quote-status" name="status" defaultValue={status}><option value="new">New</option><option value="viewed">Viewed</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select><button type="submit" disabled={pending} className={`${s.btn} ${s.btnPrimary}`}>{pending?'Saving…':'Update status'}</button></div>{message&&<p role="status" className={s.notice}>{message}</p>}</form>;
}
