// The original renderer uses source paths as geometry/material identifiers.
// Keep those identifiers resolvable after content-addressed storage migration.
import { glassPanes } from './glass-panes.js';
import { glassUnits } from './glass-units.js';
import { hydrate, designsFor, questionList, reconcile } from './configuration.js';
import { visibleQuestions, cataloguesFrom } from './windows.js';
export function installAssets(paths) {
  for (const [key, panes] of Object.entries(glassPanes)) glassPanes[paths[key] || key] = panes;
  for (const units of Object.values(glassUnits)) for (const unit of units) unit.src = paths[unit.src] || unit.src;
}
export function resolveAsset(paths, storedPath) {
  if (!storedPath) return '';
  const marker='advance70-casement/';
  const index=storedPath.indexOf(marker);
  return paths[storedPath] || (index>=0 ? paths[`/window-data/${storedPath.slice(index+marker.length)}`] : null) || storedPath;
}
export function doorState(data, source, configuration) {
  const range=source.range;
  const style=configuration.style || (range==='gripcore-stable'?'Stable':'Traditional');
  const choices=designsFor(data,range,style);
  const design=choices.find(d=>d.designId===configuration.design_id)||choices[0]||source;
  const sides={};
  for(const [section,id] of Object.entries(configuration.side_designs||{})){
    const side=data.sideDesigns?.[range]?.find(d=>d.designId===id);
    if(side)sides[section]=side;
  }
  let picks={...configuration.picks};
  // Parent choices and visible descendants settle together in a bounded pass.
  let questions=[];
  for(let i=0;i<4;i++){
    questions=questionList(data,source,design,sides,picks);
    const next=reconcile(picks,questions);
    if(JSON.stringify(next)===JSON.stringify(picks))break;
    picks=next;
  }
  return {design,sides,questions,picks,style};
}
export function windowState(source,shared,overrides,picks,images={}) {
  const catalogues=cataloguesFrom(shared,overrides);
  let next={...picks};let questions=[];
  for(let i=0;i<5;i++){
    questions=visibleQuestions(source,catalogues,next,images);
    const valid=Object.fromEntries(questions.map(q=>[q.key,q.options.find(o=>o.id===next[q.key])?.id || q.options.find(o=>o.isCurrentOption)?.id || q.options[0]?.id]).filter(([,id])=>id));
    if(JSON.stringify(valid)===JSON.stringify(next))break;
    next=valid;
  }
  return {questions,picks:next,catalogues};
}
export {hydrate};
