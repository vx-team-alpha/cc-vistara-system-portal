import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import createDOMPurify from 'dompurify';
import {hydrate,installAssets,doorState,windowState} from '../../src/lib/configurator/runtime/adapter.js';
import {renderDoor} from '../../src/lib/configurator/runtime/rendering.js';
import {renderWindow} from '../../src/lib/configurator/runtime/window-renderer.js';
import {validateConfiguration} from '../../src/lib/configurator/runtime/validate.js';
import {catalogueDimensions} from '../../src/lib/configurator/runtime/dimensions.js';
const dir='.frontage-seed/';
const rows=JSON.parse(fs.readFileSync(dir+'catalogue.json'));
const assets=JSON.parse(fs.readFileSync(dir+'assets.json'));
const aliases=JSON.parse(fs.readFileSync(dir+'asset-paths.json'));
const paths=Object.fromEntries(Object.entries(aliases).map(([key,value])=>[key,value.cdn_url]));
const read=key=>JSON.parse(fs.readFileSync(dir+'objects/'+aliases[key].hash));
const byUrl=new Map(assets.map(a=>[a.cdn_url,a]));
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{const asset=byUrl.get(String(url));if(!asset)throw new Error(`Unmapped render dependency: ${url}`);return new Response(fs.readFileSync(dir+'objects/'+asset.hash));};
const dom=new JSDOM('');globalThis.DOMParser=dom.window.DOMParser;globalThis.XMLSerializer=dom.window.XMLSerializer;
const purify=createDOMPurify(dom.window);
installAssets(paths);
const originalRange=rows.product_ranges.find(r=>r.slug==='original');
const door=rows.layouts.find(l=>l.range_id===originalRange.id&&l.features.kind==='layout'&&l.name==='Door Left Hand');
const manifest=hydrate(read('/catalogue/manifest.json'));
const configuration={picks:{},texts:{},side_designs:{}};
test('door finish choice changes the stored-catalogue SVG and sanitizes safely',async()=>{
 const state=doorState(manifest,door.features.source,configuration);
 const render=state=>renderDoor({data:manifest,layout:door.features.source,design:state.design,sideDesigns:state.sides,questions:state.questions,picks:state.picks,texts:{},internal:false});
 const first=await render(state);assert.match(first,/<svg/);
 const colour=state.questions.find(q=>q.originalName==='Door Colour (External)');assert.ok(colour?.options.length>1);
 const alternative=colour.options.find(o=>o.id!==state.picks[colour.key]);
 const next=doorState(manifest,door.features.source,{...configuration,picks:{...state.picks,[colour.key]:alternative.id}});
 const second=await render(next);assert.notEqual(first,second);
 const safe=purify.sanitize(second+'<script>alert(1)</script>',{USE_PROFILES:{svg:true,svgFilters:true}});
 assert.doesNotMatch(safe,/<script|onload=/i);assert.match(safe,/<image/);
});
test('door snapshot uses catalogue labels and rejects forged choices',async()=>{
 const state=doorState(manifest,door.features.source,configuration);
 const runtime={kind:'door',source:door.features.source,paths,read:async key=>read(key)};
 const result=await validateConfiguration(runtime,{...configuration,picks:state.picks,style:state.style,design_id:state.design.designId});
 assert.ok(result.particulars.length>0);
 await assert.rejects(()=>validateConfiguration(runtime,{...configuration,picks:{forged:'00000000-0000-4000-8000-000000000111'}}));
});
test('window glazing reveals dependent questions and inside/outside SVGs render',async()=>{
 const range=rows.product_ranges.find(r=>r.slug==='advance70-sculptured-casement');
 const window=rows.layouts.find(l=>l.range_id===range.id&&l.features.kind==='layout');
 const source=window.features.source;
 const shared=read('/window-data/sculptured-casement/questions.json');const overrides=read('/window-data/sculptured-casement/questions-by-style.json');
 const initial=windowState(source,shared,overrides,{});
 const glazing=initial.questions.find(q=>q.name==='Glazing Method');assert.ok(glazing);
 const glazed=glazing.options.find(o=>o.description==='Glazed');assert.ok(glazed);
 const next=windowState(source,shared,overrides,{...initial.picks,[glazing.key]:glazed.id});
 assert.ok(next.questions.some(q=>q.name==='Glass Type'));
 const materials=read('/window-data/render-materials.json');
 for(const internal of [false,true]){
  const face=source.images.find(i=>i.type===(internal?2:1));assert.ok(face);
  const svg=await(await fetch(face.path)).text();
  const output=renderWindow(svg,next.questions,next.picks,internal,materials,source);assert.match(output,/<svg/);assert.doesNotMatch(output,/<script|foreignObject/i);
  assert.match(output,/layertype="Dimensions"/);
  assert.match(output,/data-dimension="Overall width"/);
  assert.match(output,new RegExp(`>(?:✎ )?${catalogueDimensions(source).find(d=>d.description==='Overall width')?.value}<`));
 }
 const result=await validateConfiguration({kind:'window',source,paths,read:async key=>read(key),layout:{product_ranges:{slug:range.slug}}},{...configuration,picks:next.picks});
 assert.ok(result.particulars.some(p=>p.question==='Glazing Method'&&p.answer==='Glazed'));
});

test('window and door elevations expose catalogue millimetre dimensions', async () => {
 const range=rows.product_ranges.find(r=>r.slug==='advance70-sculptured-casement');
 const window=rows.layouts.find(l=>l.range_id===range.id&&l.features.kind==='layout'&&(l.features.source?.dimensions||[]).some(d=>d.description==='Horizontal span 1'));
 const source=window.features.source;
 const materials=read('/window-data/render-materials.json');
 const face=source.images.find(i=>i.type===1);
 const svg=await(await fetch(face.path)).text();
 const state=windowState(source,read('/window-data/sculptured-casement/questions.json'),read('/window-data/sculptured-casement/questions-by-style.json'),{});
 const output=renderWindow(svg,state.questions,state.picks,false,materials,source);
 assert.doesNotMatch(output,/<foreignObject/i);
 assert.match(output,/data-dimension="Overall width"/);
 assert.match(output,/data-dimension="Overall height"/);
 assert.match(output,/data-dimension="Horizontal span 1"/);
 const width=String(catalogueDimensions(source).find(d=>d.description==='Overall width').value);
 assert.match(output,new RegExp(`>(?:✎ )?${width}<`));

 const doorSvg=await renderDoor({data:manifest,layout:door.features.source,design:doorState(manifest,door.features.source,configuration).design,sideDesigns:{},questions:doorState(manifest,door.features.source,configuration).questions,picks:doorState(manifest,door.features.source,configuration).picks,texts:{},internal:false});
 assert.match(doorSvg,/layertype="Dimensions"/);
 assert.match(doorSvg,/data-dimension="Overall width"/);
 assert.match(doorSvg,/data-dimension="Overall height"/);
 assert.match(doorSvg,/>(?:✎ )?900</);
 assert.match(doorSvg,/>(?:✎ )?2050</);
});
test.after(()=>{globalThis.fetch=originalFetch;dom.window.close();});

test('hardware finish retains shading and reaches the inside handle', async () => {
 const state=doorState(manifest,door.features.source,configuration);
 const q=state.questions.find(q=>q.originalName==='Hardware Colour');
 const gold=q.options.find(o=>o.description==='Gold');assert.ok(gold);
 for(const internal of [false,true]){
  const svg=await renderDoor({data:manifest,layout:door.features.source,design:state.design,sideDesigns:state.sides,questions:state.questions,picks:{...state.picks,[q.key]:gold.id},texts:{},internal});
  const doc=new dom.window.DOMParser().parseFromString(svg,'image/svg+xml');
  const handles=[...doc.querySelectorAll('[data-section="door"] image')].filter(el=>/handle_/i.test(decodeURIComponent(Object.entries(manifest.assets).find(([,a])=>a.src===el.getAttributeNS('http://www.w3.org/1999/xlink','href'))?.[0]||'')));
  assert.ok(handles.length);assert.ok(handles.every(el=>el.hasAttribute('filter')), 'both faces must tint their handles');
  assert.ok(doc.querySelector('filter[id^="hardware-"] feComponentTransfer'), 'metal shading must survive tinting');
 }
});

test('inside door glass aperture stays aligned with its mirrored image', async () => {
 const state=doorState(manifest,door.features.source,configuration);
 const svg=await renderDoor({data:manifest,layout:door.features.source,design:state.design,sideDesigns:state.sides,questions:state.questions,picks:state.picks,texts:{},internal:true});
 const doc=new dom.window.DOMParser().parseFromString(svg,'image/svg+xml');
 const image=[...doc.querySelectorAll('[data-section="door"] image')].find(el=>{
  const href=el.getAttributeNS('http://www.w3.org/1999/xlink','href')||el.getAttribute('href');
  const source=Object.entries(manifest.assets).find(([,asset])=>asset.src===href)?.[0]||'';
  return /glass/i.test(decodeURIComponent(source));
 });
 assert.ok(image,'the inside face must contain its glass image');
 const clip=image.closest('g[clip-path*="pane-aperture"]');
 const clipPath=doc.getElementById(clip.getAttribute('clip-path').match(/#([^)]+)/)[1]);
 const pathNumbers=(clipPath.querySelector('path').getAttribute('d').match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
 const pathXs=pathNumbers.filter((_,index)=>index%2===0);
 const translate=(clipPath.getAttribute('transform')?.match(/translate\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(-?\d+(?:\.\d+)?)\s*\)/)||[]).slice(1).map(Number);
 const clipBounds=[Math.min(...pathXs)+(translate[0]||0),Math.max(...pathXs)+(translate[0]||0)];
 const x=Number(image.getAttribute('x')),width=Number(image.getAttribute('width'));
 const mirror=Number(image.getAttribute('transform').match(/translate\(\s*(-?\d+(?:\.\d+)?)/)?.[1]);
 const imageBounds=[mirror-x-width,mirror-x];
 assert.deepEqual(clipBounds,imageBounds,'inside glass must not be partially cut off by an offset aperture');
});

test('numerals render entered text and obscure glass stays inside the captured aperture', async () => {
 const state=doorState(manifest,door.features.source,configuration);
 const numeral=state.questions.find(q=>q.originalName==='Numeral');
 const yes=numeral.options.find(o=>o.description==='Numerals');assert.ok(yes);
 const next=doorState(manifest,door.features.source,{...configuration,picks:{...state.picks,[numeral.key]:yes.id}});
 const number=next.questions.find(q=>q.originalName==='House Number');assert.ok(number?.hasText);
 const glass=next.questions.find(q=>q.originalName==='Glass Design (Door)');
 const obscure=glass.options.find(o=>/Obscure/.test(o.description));assert.ok(obscure);
 for(const internal of [false,true]){
  const svg=await renderDoor({data:manifest,layout:door.features.source,design:next.design,sideDesigns:next.sides,questions:next.questions,picks:{...next.picks,[glass.key]:obscure.id},texts:{[number.key]:'200'},internal});
  const doc=new dom.window.DOMParser().parseFromString(svg,'image/svg+xml');
  assert.equal(doc.querySelector('[data-house-number]').textContent,'200');
  const panes=[...doc.querySelectorAll('[data-glass]')];assert.ok(panes.length);
  assert.ok(panes.every(p=>p.closest('g[clip-path*="pane-aperture"]')), 'replacement glass must keep the design aperture');
 }
});
