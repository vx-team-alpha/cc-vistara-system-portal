'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createWidget, updateWidget } from '@/server/portal/actions';
import { WidgetSchema, UpdateWidgetSchema } from '@/server/portal/schemas';
import s from './portal.module.css';
type Widget = {id:string;name:string;website_url:string;enabled:boolean};
export function WidgetForm({widget, initialType='door'}:{widget?:Widget;initialType?:'door'|'window'}){
 const [pending,startTransition]=useTransition(); const [message,setMessage]=useState(''); const [error,setError]=useState(false); const [created,setCreated]=useState<string>();
 function submit(form:FormData){
  const fields={name:String(form.get('name')||''),website_url:String(form.get('website_url')||'')};
  const parsed=widget ? UpdateWidgetSchema.safeParse({...fields,id:widget.id,enabled:form.get('enabled')==='true'}) : WidgetSchema.safeParse({...fields,type:form.get('type')});
  if(!parsed.success){setError(true);setMessage(parsed.error.issues[0].message);return;}
  startTransition(async()=>{try{
   const result=widget ? await updateWidget(parsed.data) : await createWidget(parsed.data);
   setError(!result.ok); setMessage(result.ok ? (widget?'Changes saved.':'Your component is ready. Open its settings to copy the embed code.') : result.error);
   if(result.ok && 'id' in result && typeof result.id === 'string') setCreated(result.id);
  }catch{setError(true);setMessage('Something went wrong. Please try again.');}});
 }
 return <form onSubmit={event=>{event.preventDefault();submit(new FormData(event.currentTarget));}}>
  <div className={s.field}><label className={s.label} htmlFor="widget-name">Component name</label><input className={s.input} id="widget-name" name="name" required maxLength={80} defaultValue={widget?.name} placeholder="e.g. Main website doors"/></div>
  {!widget && <div className={s.field}><label className={s.label} htmlFor="widget-type">Product type</label><select id="widget-type" name="type" className={s.select} defaultValue={initialType}><option value="door">Doors</option><option value="window">Windows</option></select><span className={s.hint}>Door and window components have separate embed codes.</span></div>}
  <div className={s.field}><label className={s.label} htmlFor="widget-website">Website URL <span className={s.hint}>(optional)</span></label><input className={s.input} type="url" id="widget-website" name="website_url" defaultValue={widget?.website_url} placeholder="https://your-website.com" maxLength={500}/><span className={s.hint}>For your records. This does not restrict where the component can be embedded.</span></div>
  {widget && <div className={s.field}><label className={s.label} htmlFor="widget-enabled">Availability</label><select className={s.select} id="widget-enabled" name="enabled" defaultValue={String(widget.enabled)}><option value="true">Live — accept visitors and enquiries</option><option value="false">Paused — hide the public component</option></select></div>}
  {message && <p className={s.notice} data-error={error||undefined} role="status">{message}</p>}
  <div className={s.actions}><button className={`${s.btn} ${s.btnPrimary}`} type="submit" disabled={pending} data-test="save-widget">{pending?'Saving…':widget?'Save changes':'Create component'}</button>{created && <Link href={`/home/widgets/${created}`} className={s.btn}>Open component</Link>}</div>
 </form>;
}
