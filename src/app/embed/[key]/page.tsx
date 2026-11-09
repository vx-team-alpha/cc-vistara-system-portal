import {notFound} from 'next/navigation';
import {z} from 'zod';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';
import {PublicEmbed} from '@/components/portal/public-embed';
import s from '@/components/portal/portal.module.css';
export const dynamic='force-dynamic';
export const metadata={title:'Choose your product · Frontage',robots:{index:false,follow:false}};
export default async function EmbedPage({params}:{params:Promise<{key:string}>}){
 const {key}=await params;if(!z.uuid().safeParse(key).success)notFound();
 const db=getSupabaseAdminClient();
 const {data:widget,error}=await db.from('embed_widgets').select('name,configurator_type_id').eq('public_key',key).eq('enabled',true).maybeSingle();
 if(error)throw new Error('Could not load this component.');if(!widget) return <div className={`${s.app} ${s.embed}`}><div className={s.empty}><h1>This component is unavailable</h1><p>Please contact the website owner for help with your enquiry.</p></div></div>;
 const {data:ranges,error:rangeError}=await db.from('product_ranges').select('id,name').eq('configurator_type_id',widget.configurator_type_id).eq('active',true);
 if(rangeError)throw new Error('Could not load product ranges.');
 const {data:layouts,error:layoutError}=ranges?.length?await db.from('layouts').select('id,name,range_id,features').in('range_id',ranges.map(r=>r.id)).eq('active',true).eq('features->>kind','layout').order('name'):{data:[],error:null};
 if(layoutError)throw new Error('Could not load products.');
 let assetPaths: Record<string,string> = {};
 if(layouts?.length){
  const {data:assetMap}=await db.from('assets').select('cdn_url').eq('external_url','frontage://asset-map').order('uploaded_at',{ascending:false}).limit(1).maybeSingle();
  if(assetMap?.cdn_url){
   try { const response=await fetch(assetMap.cdn_url,{cache:'force-cache'}); if(response.ok) assetPaths=await response.json(); } catch { /* Keep the gallery available if previews cannot be loaded. */ }
  }
 }
 const products=(layouts||[]).map(row=>{
  const features=row.features as Record<string,unknown>;
  const source=features.source as {views?:Record<string,{src?:string}>;style?:{styleSvg?:string};slim?:{svg?:string}}|undefined;
  const imagePath=source?.views?.['1']?.src||source?.style?.styleSvg||source?.slim?.svg||'';
  const marker='advance70-casement/';
  const index=imagePath.indexOf(marker);
  const image=assetPaths[imagePath]||(index>=0?assetPaths[`/window-data/${imagePath.slice(index+marker.length)}`]:'')||(/^(https?:\/\/)/.test(imagePath)?imagePath:'');
  return {id:row.id,name:row.name,range_id:row.range_id,image};
 });
 return <div className={`${s.app} ${s.embed}`}><PublicEmbed publicKey={key} name={widget.name} ranges={ranges||[]} products={products}/></div>;
}
