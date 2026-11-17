import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';
import {loadPublicCatalogue} from '@/server/portal/catalogue';
export async function GET(request:Request,{params}:{params:Promise<{key:string}>}){
 const {key}=await params;const id=new URL(request.url).searchParams.get('layout');
 if(!z.uuid().safeParse(key).success||!z.uuid().safeParse(id).success)return NextResponse.json({error:'Invalid component or product'},{status:400});
 const db=getSupabaseAdminClient();const {data:widget,error}=await db.from('embed_widgets').select('configurator_type_id').eq('public_key',key).eq('enabled',true).maybeSingle();
 if(error)return NextResponse.json({error:'Service unavailable'},{status:503});if(!widget)return NextResponse.json({error:'Component unavailable'},{status:404});
 try{const config=await loadPublicCatalogue(id!,widget.configurator_type_id);if(!config)return NextResponse.json({error:'Product unavailable'},{status:404});return NextResponse.json({kind:config.kind,source:config.source,paths:config.paths,urls:config.urls},{headers:{'Cache-Control':'private, max-age=300, stale-while-revalidate=3600'}});}catch{return NextResponse.json({error:'The configuration catalogue is not ready. Please try again.'},{status:503});}
}
