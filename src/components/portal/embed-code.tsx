'use client';
import {useSyncExternalStore,useState} from 'react';
import s from './portal.module.css';
const subscribe=()=>()=>{};
export function EmbedCode({publicKey,name}:{publicKey:string;name:string}){
 const origin=useSyncExternalStore(subscribe,()=>window.location.origin,()=> ''); const [message,setMessage]=useState('');
 const link=`${origin}/embed/${publicKey}`;
 const safeName=name.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const snippet=`<iframe src="${link}" title="${safeName}" width="100%" height="780" style="border:0" loading="lazy"></iframe>`;
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setMessage('Copied to clipboard.');}catch{setMessage('Copy was unavailable. Select the code above and copy it manually.');}}
 return <><p className={s.cardNote}>Paste this code into an HTML block on your website. The public link collects enquiries for this component.</p><div className={s.field}><label className={s.label} htmlFor="embed-code">Iframe code</label><textarea id="embed-code" className={s.textarea} readOnly value={snippet} onFocus={e=>e.target.select()}/></div><div className={s.actions}><button type="button" className={s.btn} disabled={!origin} onClick={()=>copy(snippet)} data-test="copy-embed">Copy embed code</button><a href={link} className={s.btn} target="_blank" rel="noreferrer">Open preview</a><button className={s.btn} type="button" disabled={!origin} onClick={()=>copy(link)}>Copy public link</button></div>{message&&<p role="status" className={s.notice}>{message}</p>}<p className={s.hint}>Preview visits count as tracked sessions. Pausing this component also pauses its public link.</p></>;
}
