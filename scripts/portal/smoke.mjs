import assert from 'node:assert/strict';
import {hydrate,doorState} from '../../src/lib/configurator/runtime/adapter.js';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('This smoke test creates temporary data and requires local Supabase.');
const app=process.env.FRONTAGE_TEST_APP_URL||'http://localhost:3018';
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const checked=({data,error})=>{if(error)throw error;return data;};
let user;
try{
 const email=`portal-smoke-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa1!';
 user=checked(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
 const cookies=new Map();
 const client=createServerClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:values=>values.forEach(c=>cookies.set(c.name,c.value))}});
 checked(await client.auth.signInWithPassword({email,password}));
 const cookie=[...cookies].map(([name,value])=>`${name}=${value}`).join('; ');
 const type=checked(await client.from('configurator_types').select('id').eq('slug','door').single());
 const widget=checked(await client.from('embed_widgets').insert({account_id:user.id,configurator_type_id:type.id,name:'Smoke test doors'}).select().single());
 let response=await fetch(`${app}/home`,{redirect:'manual'});assert.equal(response.status,307);
 for(const route of ['/home','/home/widgets',`/home/widgets/${widget.id}`,'/home/quotes','/home/settings']){
  response=await fetch(app+route,{headers:{cookie}});assert.equal(response.status,200,route);
 }
 response=await fetch(`${app}/embed/${widget.public_key}`);assert.equal(response.status,200);assert.match(await response.text(),/Loading product options/);
 const session_id=randomUUID();const endpoint=`${app}/api/embed/${widget.public_key}`;
 const post=body=>fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 for(let i=0;i<2;i++){response=await post({kind:'view',session_id});assert.equal(response.status,200);}
 const views=await admin.from('widget_views').select('id',{count:'exact',head:true}).eq('widget_id',widget.id);if(views.error)throw views.error;assert.equal(views.count,1);
 const range=checked(await admin.from('product_ranges').select('id').eq('configurator_type_id',type.id).limit(1).single());
 const layout=checked(await admin.from('layouts').select('id').eq('range_id',range.id).eq('features->>kind','layout').limit(1).single());
 response=await fetch(`${app}/api/embed/${widget.public_key}/config?layout=${layout.id}`);assert.equal(response.status,200);
 const runtime=await response.json();
 const data=hydrate(await (await fetch(runtime.urls.manifest)).json());
 const state=doorState(data,runtime.source,{picks:{},texts:{},side_designs:{}});
 const configuration={style:state.style,design_id:state.design.designId,picks:state.picks,texts:{},side_designs:{}};
 const input={configuration,kind:'quote',session_id,layout_id:layout.id,name:'Smoke Test Customer',email:'customer@example.invalid',phone:'',message:'Initial message',company:''};
 response=await post(input);assert.equal(response.status,200);
 response=await post({...input,message:'Retry must not replace the original'});assert.equal(response.status,200);
 const leads=checked(await admin.from('leads').select('id,spec').eq('widget_id',widget.id));assert.equal(leads.length,1);assert.equal(leads[0].spec.message,'Initial message');assert.ok(leads[0].spec.configuration.particulars.length>0);
 response=await post({...input,session_id:randomUUID(),configuration:{...configuration,picks:{forged:randomUUID()}}});assert.equal(response.status,400);
 response=await fetch(`${app}/home/quotes/${leads[0].id}`,{headers:{cookie}});assert.equal(response.status,200);assert.match(await response.text(),/Smoke Test Customer/);
 const wrongRange=checked(await admin.from('product_ranges').select('id').neq('configurator_type_id',type.id).limit(1).single());
 const wrongLayout=checked(await admin.from('layouts').select('id').eq('range_id',wrongRange.id).limit(1).single());
 response=await post({...input,session_id:randomUUID(),layout_id:wrongLayout.id});assert.equal(response.status,400);
 checked(await client.from('embed_widgets').update({enabled:false}).eq('id',widget.id));
 response=await post({kind:'view',session_id:randomUUID()});assert.equal(response.status,404);
 console.log('Passed: authenticated portal pages, public embed, session deduplication, immutable submission retries, wrong-product rejection and pause behavior.');
}finally{
 if(user){const {error}=await admin.auth.admin.deleteUser(user.id);if(error)throw error;console.log('Temporary test account and data removed.');}
}
