import { glassUnits } from './glass-units.js';
import { attachDoorDimensions } from './dimensions.js';

const NS = 'http://www.w3.org/2000/svg';
const XL = 'http://www.w3.org/1999/xlink';
const cache = new Map();
export async function loadSvg(src) {
  if (!cache.has(src)) cache.set(src, fetch(src).then(r => {
    if (!r.ok) throw Error('The door drawing could not be loaded.');
    return r.text();
  }).catch(error => { cache.delete(src); throw error; }));
  return cache.get(src);
}
const parse = text => new DOMParser().parseFromString(text, 'image/svg+xml');
const imageUrl = e => e.getAttributeNS(XL, 'href') || e.getAttribute('href') || '';
const selected = (q, picks) => q.options.find(o => o.id === picks[q.key]) ?? q.options.find(o => o.id === q.currentId) ?? q.options.find(o => o.isCurrentOption) ?? q.options[0];
const make = (doc, tag, attrs) => { const el = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };

function namespace(doc, prefix) {
  for (const el of doc.querySelectorAll('[id]')) {
    const id = el.id;
    for (const target of doc.querySelectorAll('*')) for (const attr of [...target.attributes]) {
      if (attr.value.includes(`#${id}`)) target.setAttribute(attr.name, attr.value.replaceAll(`#${id}`, `#${prefix}${id}`));
    }
    el.id = prefix + id;
  }
}

function colour(doc, rgb, selector) {
  if (!rgb) return;
  const id = `finish-${rgb.join('-')}`;
  const defs = doc.querySelector('defs');
  if (!doc.getElementById(id)) {
    const filter = make(doc, 'filter', { id });
    filter.append(make(doc, 'feColorMatrix', { in: 'SourceGraphic', type: 'matrix', result: `${id}-matrix`, values: `${rgb[0]/255} 0 0 0 0 0 ${rgb[1]/255} 0 0 0 0 0 ${rgb[2]/255} 0 0 0 0 0 1 0` }));
    filter.append(make(doc, 'feBlend', { mode: 'multiply', in: `${id}-matrix`, in2: `${id}-matrix` }));
    defs.append(filter);
  }
  for (const el of selector) el.setAttribute('filter', `url(#${id})`);
}

function leafScene(doc) {
  return [...doc.querySelectorAll('g[layertype="Diagram"]')].filter(g =>
    !g.querySelector('[memberid]') && ![...g.childNodes].some(c => c.nodeType === 8 && /Profile_member|Glass_sightline_component|^\s*Glass_component/.test(c.textContent)));
}

function assetUrl(data, el) {
  const src = imageUrl(el);
  return Object.entries(data.assets).find(([, asset]) => asset.src === src)?.[0] ?? '';
}

function srcNamed(data, fragment) {
  const hit = Object.entries(data.assets).find(([url, asset]) => asset.src && decodeURIComponent(url).includes(fragment));
  return hit?.[1].src ?? '';
}

function centerIn(el, box) {
  const x = Number(el.getAttribute('x') || 0);
  const y = Number(el.getAttribute('y') || 0);
  const w = Number(el.getAttribute('width') || 0);
  const h = Number(el.getAttribute('height') || 0);
  const cx = x + w / 2;
  const cy = y + h / 2;
  return cx >= box[0] && cx <= box[0] + box[2] && cy >= box[1] && cy <= box[1] + box[3];
}

const SIDE_CASSETTE = {
  'Sidelight Birkdale': 'image_twin_arch_square_to_round',
  'Sidelight Carnoustie': 'image_twin_vertical',
  'Sidelight Medinah': 'image_twin_vertical',
  'Sidelight Muirfield': 'image_twin_top',
  'Sidelight Penina Left': 'image_twin_eyebrow_square_to_taper_left',
  'Sidelight Penina Right': 'image_twin_eyebrow_square_to_taper_right',
  'Sidelight Troon': 'image_half_glazed',
};

function toneFor(name = '') {
  if (/black/i.test(name)) return 'black';
  if (/chrome|stainless|satin silver/i.test(name)) return 'chrome';
  return '';
}

const HARDWARE_TINT = {
  Gold: [198, 161, 91],
  'Rose Gold': [183, 110, 121],
  White: [236, 236, 236],
};

function tintFlat(doc, rgb, el) {
  if (!rgb) return;
  const id = `hardware-${rgb.join('-')}`;
  if (!doc.getElementById(id)) {
    const filter = make(doc, 'filter', { id });
    filter.append(make(doc, 'feColorMatrix', { type: 'saturate', values: '0' }));
    const transfer = make(doc, 'feComponentTransfer', {});
    for (const [index, channel] of ['R', 'G', 'B'].entries()) {
      const value = rgb[index] / 255;
      transfer.append(make(doc, 'feFunc' + channel, { type: 'table', tableValues: `0 ${value * .35} ${value * .78} ${value} ${value + (1 - value) * .75}` }));
    }
    filter.append(transfer);
    doc.querySelector('defs').append(filter);
  }
  el.setAttribute('filter', `url(#${id})`);
}

function swapTone(data, localSrc, tone) {
  if (!tone) return localSrc;
  const current = Object.entries(data.assets).find(([, asset]) => asset.src === localSrc);
  if (!current) return localSrc;
  const decoded = decodeURIComponent(current[0]).replace(/black|chrome/ig, tone);
  const found = Object.entries(data.assets).find(([url, asset]) => asset.src && decodeURIComponent(url) === decoded);
  return found?.[1].src || localSrc;
}

function glassUnit(optionId, width, height) {
  const list = glassUnits[optionId];
  if (!list?.length || !height) return null;
  const aspect = width / height;
  return list.slice().sort((a, b) => Math.abs(a.w / a.h - aspect) - Math.abs(b.w / b.h - aspect))[0];
}

function paintGlass(doc, elements, chosen, parent) {
  if (!chosen || /standard glass \(clear\)/i.test(chosen.description)) return;
  for (const el of elements) {
    const width = Number(el.getAttribute('width') || 0);
    const height = Number(el.getAttribute('height') || 0);
    const unit = glassUnit(chosen.id, width, height);
    if (!unit) continue;
    const host = parent || el.parentElement;
    if (!host) continue;
    const tile = unit.w < 360 && unit.h < 360;
    if (tile) {
      const svg = el.ownerSVGElement || doc.documentElement;
      let defs = svg.querySelector(':scope > defs') || svg.querySelector('defs');
      if (!defs) {
        defs = make(doc, 'defs', {});
        svg.prepend(defs);
      }
      const scope = svg.getAttribute('data-section') || 'frame';
      const id = `glass-tile-${scope}-${chosen.id}`;
      if (!svg.querySelector(`[id="${id}"]`)) {
        const pattern = make(doc, 'pattern', { id, patternUnits: 'userSpaceOnUse', width: unit.w, height: unit.h });
        const image = make(doc, 'image', { x: 0, y: 0, width: unit.w, height: unit.h, preserveAspectRatio: 'none' });
        image.setAttributeNS(XL, 'href', unit.src);
        pattern.append(image);
        defs.append(pattern);
      }
      const rect = make(doc, 'rect', {
        x: el.getAttribute('x') || 0, y: el.getAttribute('y') || 0, width, height, fill: `url(#${id})`,
      });
      for (const attr of ['transform', 'clip-path', 'mask']) if (el.hasAttribute(attr)) rect.setAttribute(attr, el.getAttribute(attr));
      rect.setAttribute('data-glass', 'true');
      el.replaceWith(rect);
      continue;
    }
    const fit = Math.abs(unit.w / unit.h - width / height) < 0.04 ? 'xMidYMid meet' : 'xMidYMid slice';
    if (el.localName === 'image') {
      el.setAttributeNS(XL, 'href', unit.src);
      el.setAttribute('preserveAspectRatio', fit);
      const viewport = make(doc, 'svg', { x: el.getAttribute('x') || 0, y: el.getAttribute('y') || 0, width, height, viewBox: `0 0 ${width} ${height}`, overflow: 'hidden', 'data-glass': 'true' });
      if (el.hasAttribute('transform')) { viewport.setAttribute('transform', el.getAttribute('transform')); el.removeAttribute('transform'); }
      el.replaceWith(viewport);
      el.setAttribute('x', '0'); el.setAttribute('y', '0');
      viewport.append(el);
      continue;
    }
    const image = make(doc, 'image', {
      x: el.getAttribute('x') || 0, y: el.getAttribute('y') || 0, width, height,
      preserveAspectRatio: fit, opacity: '1',
    });
    image.setAttributeNS(XL, 'href', unit.src);
    host.append(image);
  }
}

function glassPanes(doc) {
  const panes = [];
  const walk = node => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 8) {
        const id = child.textContent.trim().match(/^Glass_component_([0-9a-f-]{36})$/i)?.[1];
        const group = child.nextElementSibling;
        const rect = [...(group?.children ?? [])].find(el => el.localName === 'rect' && /gradient-glass/.test(el.getAttribute('fill') || ''));
        if (id && rect) panes.push({ id, group, rect });
      } else if (child.childNodes?.length) walk(child);
    }
  };
  walk(doc.documentElement || doc);
  return panes;
}

export async function renderDoor({ data, layout, design, sideDesigns, questions, picks, texts, internal }) {
  const face = internal ? '2' : '1';
  const base = parse(await loadSvg(layout.views[face].src));
  const sections = layout.views[face].sections;
  const choice = (name, sectionId) => {
    const q = sectionId
      ? questions.find(item => item.originalName === name && item.section === sectionId)
      : questions.find(item => item.originalName === name && (item.section === 'door' || item.section === 'layout'))
        ?? questions.find(item => item.originalName === name);
    return q ? selected(q, picks) : null;
  };
  const external = choice(internal ? 'Door Colour (Internal)' : 'Door Colour (External)');
  const hardware = choice('Hardware Colour');
  const glass = choice('Glass Design (Door)');
  const cassette = choice('Cassette Type');
  let sourceDesign = design ?? layout;
  const variant = data.variants.find(v => v.range === design?.range && v.designId === design?.designId && v.questionName === 'Glass Design (Door)' && v.optionId === glass?.id);
  if (variant) sourceDesign = variant;
  const cassetteVariant = data.variants.find(v => v.range === design?.range && v.designId === design?.designId && v.questionName === 'Cassette Type' && v.optionId === cassette?.id);
  if (cassetteVariant && !variant) sourceDesign = cassetteVariant;
  const docs = await Promise.all(sections.map(async section => {
    const state = section.role === 'side' ? (sideDesigns[section.id] ?? layout) : sourceDesign;
    const doc = parse(await loadSvg(state.views[face].src));
    const sourceSection = state.views[face].sections.find(s => s.role === section.role) ?? state.views[face].sections[0];
    return { section, state, doc, sourceSection };
  }));
  // Keep exact outer frame, cill, toplight and sidelight geometry from the chosen
  // layout. Replace only the leaf/cassette/accessory scene, never the whole SVG.
  const diagrams = leafScene(base);
  const insertion = diagrams[0];
  if (!insertion) throw Error('This layout has no door drawing.');
  const parent = insertion.parentElement;
  const marker = make(base, 'g', { 'data-leaves': 'true' });
  parent.insertBefore(marker, insertion);
  for (const diagram of diagrams) diagram.remove();
  for (const [index, { section, doc, sourceSection }] of docs.entries()) {
    if (!sourceSection) continue;
    namespace(doc, `section-${index}-`);
    const scene = leafScene(doc);
    const rgb = external?.description === 'White' ? null : external?.rgb;
    const materialImages = [...doc.querySelectorAll('image')].filter(e => {
      const a = Object.entries(data.assets).find(([, a]) => a.src === imageUrl(e));
      return a && /slab_blank|cassette|unknown.*flat_grain/.test(a[0]);
    });
    for (const image of materialImages) image.removeAttribute('filter');
    const recipe = data.finishes?.[external?.id];
    if (recipe) {
      for (const text of recipe.filters) doc.querySelector('defs').append(doc.importNode(parse(text).documentElement, true));
      for (const image of materialImages) {
        if (recipe.filter) image.setAttribute('filter', recipe.filter);
        if (/slab_blank/.test(Object.entries(data.assets).find(([,a])=>a.src===imageUrl(image))?.[0] ?? '') && !/image_farmhouse_cottage/.test(recipe.sourceTexture)) image.setAttributeNS(XL,'href',recipe.texture);
      }
    } else colour(doc, external?.description === 'Azure' ? [0, 102, 177] : rgb, materialImages);
    const box = section.box, sourceBox = sourceSection.box;
    const nested = make(base, 'svg', { x:box[0], y:box[1], width:box[2], height:box[3], viewBox:sourceBox.join(' '), preserveAspectRatio:'none', overflow:'hidden', 'data-section':section.role });
    nested.append(base.importNode(doc.querySelector('defs'), true));
    for (const g of scene) nested.append(base.importNode(g, true));
    const localImages = () => [...nested.querySelectorAll('image')];
    const glassImages = () => localImages().filter(el => /glass/i.test(decodeURIComponent(assetUrl(data, el))));
    const cassetteImages = () => localImages().filter(el => {
      const url = decodeURIComponent(assetUrl(data, el));
      return /cassette|image_twin_|augusta_|half_glazed|flat_grain/i.test(url) && !/glass|slab_blank|side_panel/i.test(url);
    });
    if (section.role === 'side') {
      const sideDesign = choice('Door Design (Side)', section.id);
      const fragment = SIDE_CASSETTE[sideDesign?.description];
      if (sideDesign?.description === 'Sidelight Solid') {
        for (const el of [...glassImages(), ...cassetteImages()]) el.remove();
      } else if (fragment) {
        const href = srcNamed(data, fragment);
        const fit = el => {
          const y = Number(el.getAttribute('y') || 0);
          const h = Number(el.getAttribute('height') || 0);
          const x = Number(el.getAttribute('x') || 0);
          const w = Number(el.getAttribute('width') || 0);
          if (sideDesign.description === 'Sidelight Muirfield') el.setAttribute('height', h * 0.28);
          if (sideDesign.description === 'Sidelight Troon') { el.setAttribute('y', y + h * 0.34); el.setAttribute('height', h * 0.32); }
          if (sideDesign.description === 'Sidelight Medinah') { el.setAttribute('x', x + w * 0.18); el.setAttribute('width', w * 0.64); }
        };
        for (const el of cassetteImages()) { if (href) el.setAttributeNS(XL, 'href', href); fit(el); }
        for (const el of glassImages()) fit(el);
      }
    }
    const glassChoice = choice(section.role === 'side' ? 'Glass Design (Side)' : 'Glass Design (Door)', section.role === 'side' ? section.id : undefined);
    // Reuse the captured glass aperture, including arches and curved tops.
    // Its selector transform maps the path into the scene's image coordinates.
    const aperture = [...nested.querySelectorAll('g[clip-path]')].find(g =>
      g.previousSibling?.textContent?.includes('Slab_glass_component_selector') ||
      g.previousElementSibling?.textContent?.includes('Slab_glass_component_selector'));
    // XML whitespace separates the selector comment from its group.
    const apertureGroup = aperture || [...nested.querySelectorAll('g[clip-path]')].find(g => {
      let node = g.previousSibling;
      while (node && node.nodeType === 3) node = node.previousSibling;
      return node?.nodeType === 8 && node.textContent.includes('Slab_glass_component_selector');
    });
    if (apertureGroup) {
      const path = apertureGroup.querySelector('clipPath');
      if (path) {
        const clip = path.cloneNode(true);
        clip.id = `pane-aperture-${index}`;
        if (apertureGroup.hasAttribute('transform')) {
          let transform = apertureGroup.getAttribute('transform');
          // Inside-face paths are already mirrored by the catalogue. Their
          // selector translation is not, so carrying its positive x offset
          // across clips away half of a centred pane.
          if (glassImages().some(image => /scale\(\s*-1[\s,]+1\s*\)/.test(image.getAttribute('transform') || ''))) {
            transform = transform.replace(/translate\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(-?\d+(?:\.\d+)?)\s*\)/, (_, x, y) => `translate(${-Number(x)} ${y})`);
          }
          clip.setAttribute('transform', transform);
        }
        nested.querySelector('defs').append(clip);
        for (const image of glassImages()) {
          const group = make(base, 'g', { 'clip-path': `url(#${clip.id})` });
          image.replaceWith(group); group.append(image);
        }
      }
    }
    paintGlass(base, glassImages(), glassChoice);
    const tone = toneFor(hardware?.description);
    const tint = HARDWARE_TINT[hardware?.description] ?? null;
    const handle = choice('Handle');
    for (const el of localImages().filter(el => /handle_/i.test(decodeURIComponent(assetUrl(data, el))))) {
      if (handle && /^No /.test(handle.description)) { el.remove(); continue; }
      let href = imageUrl(el);
      if (handle && /pad/i.test(handle.description)) href = srcNamed(data, `lever_pad_${tone || 'chrome'}`) || href;
      else if (handle && /lever\/lever/i.test(handle.description)) href = srcNamed(data, `lever_lever_${tone || 'chrome'}`) || href;
      else href = swapTone(data, href, tone || 'chrome');
      if (href) el.setAttributeNS(XL, 'href', href);
      if (tint) tintFlat(base, tint, el);
    }
    if (section.role === 'door') {
      for (const el of localImages().filter(el => /letterplate|spyhole|knocker/i.test(decodeURIComponent(assetUrl(data, el))))) el.remove();
      const slab = localImages().find(el => /slab_blank/i.test(decodeURIComponent(assetUrl(data, el))) && !/side_panel/i.test(decodeURIComponent(assetUrl(data, el))));
      const place = (fragment, fx, fy, fw, fh) => {
        if (!slab) return;
        const href = srcNamed(data, fragment);
        if (!href) return;
        const sx = Number(slab.getAttribute('x') || 0);
        const sy = Number(slab.getAttribute('y') || 0);
        const sw = Number(slab.getAttribute('width') || 1);
        const sh = Number(slab.getAttribute('height') || 1);
        const el = make(base, 'image', { x:sx + fx * sw, y:sy + fy * sh, width:fw * sw, height:fh * sh, preserveAspectRatio:'xMidYMid', opacity:'1' });
        el.setAttributeNS(XL, 'href', href);
        if (tint) tintFlat(base, tint, el);
        (slab.parentElement ?? nested).append(el);
      };
      const letter = choice('Letterplate');
      if (letter && !/^No /.test(letter.description)) {
        const position = choice('Letterplate Position')?.description || '';
        const fy = /bottom rail/i.test(position) || !position ? 1860 / 2013
          : /between cassette/i.test(position) ? 1699 / 2013
          : /position 49/i.test(position) ? 760 / 2013
          : /position 7/i.test(position) ? 1045.5 / 2013
          : 1860 / 2013;
        place(tone === 'black' ? 'black_letterplate' : 'chrome_letterplate', 295 / 914, fy, 310 / 914, 76 / 2013);
      }
      const drip = choice('Drip Bar');
      if (drip && !/^None$/i.test(drip.description) && slab) {
        const matched = /matched/i.test(drip.description);
        const rgb = !matched && /^gold$/i.test(drip.description) ? [198, 161, 91]
          : !matched && /silver/i.test(drip.description) ? [186, 190, 194]
          : !matched && /white/i.test(drip.description) ? [244, 244, 244]
          : tint || (tone === 'black' ? [42, 42, 42] : [200, 204, 208]);
        const sx = Number(slab.getAttribute('x') || 0);
        const sy = Number(slab.getAttribute('y') || 0);
        const sw = Number(slab.getAttribute('width') || 1);
        const sh = Number(slab.getAttribute('height') || 1);
        const bar = make(base, 'rect', {
          x: sx + sw * 0.08, y: sy + sh * 0.978, width: sw * 0.84, height: sh * 0.01, rx: sw * 0.004,
        });
        bar.setAttribute('fill', `rgb(${rgb.join(',')})`);
        (slab.parentElement ?? nested).append(bar);
      }
      const knocker = choice('Knocker');
      const knockerOn = knocker && !/^No /.test(knocker.description);
      const knockerHasSpy = knockerOn && /spy|peep/i.test(knocker.description);
      if (knockerOn) {
        const fragment = tone === 'black' ? (knockerHasSpy ? 'black_urn_with_spy' : 'black_urn_knocker') : (knockerHasSpy ? 'chrome_knocker_with_spyhole' : 'knocker/chrome_knocker.png');
        place(fragment, 410 / 914, 555.5 / 2013, 76 / 914, 162 / 2013);
      }
      const spyhole = choice('Spyhole');
      if (spyhole && !/^No /.test(spyhole.description) && !knockerHasSpy) {
        // A separate spyhole sits above the knocker. The knocker plate already
        // occupies the usual spyhole height, and a knocker with a spy hole
        // carries that hole in its own artwork.
        const spyY = knockerOn ? 555.5 - 32 - 18 : 583;
        place(tone === 'black' ? 'black_spyhole' : 'chrome_spyhole', 434 / 914, spyY / 2013, 32 / 914, 32 / 2013);
      }
      const numeral = choice('Numeral');
      const numberQuestion = questions.find(q => q.originalName === 'House Number');
      if (numeral?.description === 'Numerals' && numberQuestion && texts[numberQuestion.key]) {
        const panes = [...doc.querySelectorAll('image')].filter(el => /glass/i.test(decodeURIComponent(assetUrl(data, el))));
        const top = panes.length ? Math.min(...panes.map(el => Number(el.getAttribute('y') || 0))) : sourceBox[3] * .25;
        // SVG text uses a baseline: reserve the glyph height as well as
        // clearance below the leaf's top edge, including toplight layouts.
        const numberY = Math.max(sourceBox[1] + 120, Math.min(sourceBox[1] + 180, top * .57));
        const number = make(base, 'text', { x:sourceBox[0] + sourceBox[2] / 2, y:numberY, 'text-anchor':'middle', 'font-family':'Arial, sans-serif', 'font-size':70, fill: tint ? `rgb(${tint.join(',')})` : tone === 'black' ? '#252525' : '#c5c8cc', stroke:'#353535', 'stroke-width':1, 'paint-order':'stroke fill', 'data-house-number':'true' });
        number.textContent = texts[numberQuestion.key];
        if (/^Door Right Hand|^Right Hand Door/.test(layout.layoutName)) number.setAttribute('transform', `translate(${2 * sourceBox[0] + sourceBox[2]} 0) scale(-1 1)`);
        nested.append(number);
      }
    }
    const mirror = section.role === 'door' && /^Door Right Hand|^Right Hand Door/.test(layout.layoutName);
    if (mirror) {
      const flipped = make(base, 'g', { transform:`translate(${2*box[0]+box[2]} 0) scale(-1 1)` });
      flipped.append(nested); marker.append(flipped);
    } else marker.append(nested);
  }
  for (const pane of glassPanes(base)) {
    paintGlass(base, [pane.rect], choice('Glass Design (Side)', pane.id), pane.group);
  }
  // Profile member IDs are distinct from slab IDs. Transfer only the affected
  // bottom member for cills/thresholds, rather than replacing a whole frame.
  for(const name of ['Threshold','Cill']) {
    const chosen=choice(name);
    const donorState=data.variants.find(v=>v.kind==='accessory'&&v.range===layout.range&&v.questionName===name&&v.optionId===chosen?.id);
    const targetQuestion=layout.questions.find(q=>q.name===name);
    const donorQuestion=donorState?.questions.find(q=>q.name===name);
    if(!donorState||!targetQuestion?.members?.length||!donorQuestion?.members?.length)continue;
    const donor=parse(await loadSvg(donorState.views[face].src));
    namespace(donor,`member-${name}-`);
    const findMember=(doc,id)=>[...doc.querySelectorAll('g')].find(g=>[...g.childNodes].some(c=>c.nodeType===8&&c.textContent.trim()===`Profile_member_${id}`));
    const container=findMember(base,targetQuestion.members[0].id);
    const donorContainer=findMember(donor,donorQuestion.members[0].id);
    const next=(container,id)=>{
      const c=[...container.childNodes].find(c=>c.nodeType===8&&c.textContent.trim()===`Profile_member_${id}`);
      return c?.nextElementSibling;
    };
    if(!container||!donorContainer)continue;
    const old=next(container,targetQuestion.members[0].id),member=next(donorContainer,donorQuestion.members[0].id);
    if(!old||!member)continue;
    const dx=(layout.size?.['Overall width']??900)-(donorState.size?.['Overall width']??900);
    const dy=(layout.size?.['Overall height']??2050)-(donorState.size?.['Overall height']??2050);
    const replacement=base.importNode(member,true);
    replacement.setAttribute('transform',replacement.getAttribute('transform').replace(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/,(_,x,y)=>`translate(${Number(x)+dx} ${Number(y)+dy})`));
    for(const path of replacement.querySelectorAll('path')) {
      let coordinate=0;
      path.setAttribute('d',path.getAttribute('d').replace(/-?\d+(?:\.\d+)?/g,value=>{
        const x=Number(value);return coordinate++%2===0&&x>450?String(x+dx):value;
      }));
    }
    for(const rect of replacement.querySelectorAll('rect'))if(Number(rect.getAttribute('width'))<6500&&Number(rect.getAttribute('width'))>=900)rect.setAttribute('width',Number(rect.getAttribute('width'))+dx);
    base.querySelector('defs').append(...[...donor.querySelector('defs').children].map(e=>base.importNode(e,true)));
    old.replaceWith(replacement);
  }
  const profile = choice(internal ? 'Profile Colour (Internal)' : 'Profile Colour (External)') ?? choice('Profile Colour (External)');
  if (profile?.rgb && profile.description !== 'White') {
    for (const g of base.querySelectorAll('g[layertype="Diagram"]')) {
      if (![...g.childNodes].some(c => c.nodeType === 8 && /Profile_member/.test(c.textContent || ''))) continue;
      for (const rect of g.querySelectorAll('rect')) {
        const fill = rect.getAttribute('fill') || '';
        if (fill === 'white' || /^#fff(?:fff)?$/i.test(fill) || /255,\s*255,\s*255/.test(fill)) rect.setAttribute('fill', `rgb(${profile.rgb.join(',')})`);
      }
    }
  }
  const threshold = choice('Threshold');
  const thresholdRgb = /gold/i.test(threshold?.description) ? [198, 161, 91]
    : /silver/i.test(threshold?.description) ? [176, 180, 184]
    : /pvc|standard/i.test(threshold?.description) ? (profile?.rgb || [248, 248, 248])
    : null;
  if (thresholdRgb) {
    for (const rect of base.querySelectorAll('rect')) {
      if (/169,\s*169,\s*169/.test(rect.getAttribute('fill') || '')) rect.setAttribute('fill', `rgb(${thresholdRgb.join(',')})`);
    }
  }
  attachDoorDimensions(base, layout);
  base.documentElement.setAttribute('aria-label', `${internal ? 'Internal' : 'External'} view of ${layout.layoutName}`);
  return new XMLSerializer().serializeToString(base.documentElement);
}
