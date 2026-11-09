import { createHash } from 'node:crypto';

export function stableId(key) {
  const hex = createHash('sha256').update(`frontage:seed:v1:${key}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Retain full source context alongside normalized rows. Repeated question names
// are intentional: component IDs, current choices and option lists can differ.
export function buildCatalogue(manifest, catalogue, windows) {
  const rows = { product_ranges: [], design_styles: [], layouts: [], questions: [], options: [] };
  const addQuestions = (rangeId, scope, questions, section = 'door') => questions.map((q, index) => {
    const id = stableId(`question:${scope}:${index}:${q.optionHeadingId || q.id || q.name}`);
    rows.questions.push({
      id, range_id: rangeId, external_id: q.optionHeadingId || q.id || null,
      name: q.name, section_scope: /\(Side\)/i.test(q.name) ? 'side' : /threshold|cill/i.test(q.name) ? 'layout' : section,
      sort_order: q.consumerListOrder ?? q.listOrder ?? q.order ?? index,
      has_text: q.hasText ?? false, validation: q.validation || {}, condition: q.when ? { when: q.when } : null,
      active: true
    });
    for (const [order, option] of (q.options || manifest.optionSets[q.optionSet] || []).entries()) {
      rows.options.push({
        id: stableId(`option:${id}:${option.id || order}`), question_id: id,
        external_id: option.id || null, description: option.description || option.name || 'Unlabelled option',
        sort_order: order, is_default: option.id === q.currentId || !!(option.isCurrentOption || option.current),
        metadata: { ...option }
      });
    }
    return { id, source: q };
  });
  const addRange = (slug, name, type, source) => {
    const id = stableId(`range:${slug}`);
    rows.product_ranges.push({ id, slug, name, configurator_type_slug: type, source_url: source, active: true });
    return id;
  };
  const rangeNames = { original: 'ORiGINAL', gripcore: 'GRiPCORE', 'gripcore-stable': 'GRiPCORE Stable' };
  for (const [range, layouts] of Object.entries(manifest.layouts)) {
    const rangeId = addRange(range, rangeNames[range] || range, 'door', 'https://doorco.server.quotila.com');
    for (const [name, source] of Object.entries(layouts)) {
      const slim = catalogue.find(x => x.rangeId === range && x.name === name);
      if (!slim) throw new Error(`Missing slim door layout: ${range}/${name}`);
      const id = stableId(`layout:${range}:${slim.slug}`);
      rows.layouts.push({
        id, range_id: rangeId, style_id: null, external_id: source.layoutId,
        slug: slim.slug, name, features: {
          ...slim.features, kind: 'layout', source: { ...source, slim },
          question_contexts: addQuestions(rangeId, id, source.questions || [])
        },
        view_box: slim.viewBox || null, squares: slim.squares || null, active: true
      });
    }
    for (const [order, [style, designs]] of Object.entries(manifest.designs[range] || {}).entries()) {
      const styleId = stableId(`style:${range}:${style}`);
      rows.design_styles.push({ id: styleId, range_id: rangeId, name: style, sort_order: order });
      for (const source of designs) {
        const id = stableId(`design:${range}:${source.designId}`);
        rows.layouts.push({
          id, range_id: rangeId, style_id: styleId, external_id: source.designId,
          slug: `design-${source.designId}`, name: source.designName,
          features: { kind: 'design', source, question_contexts: addQuestions(rangeId, id, source.questions || []) },
          view_box: null, squares: null, active: true
        });
      }
    }
  }
  for (const { product, styles, items, shared, overrides } of windows) {
    const rangeId = addRange(`advance70-${product.folder}`, product.name, 'window', 'https://selecta.portal.quotila.com/advance70/choose-product');
    const collect = (scope, file) => Object.entries(file.questions || {}).flatMap(([name, group]) =>
      (group.contexts || []).map((q, i) => ({ ...q, name, seed_scope: `${scope}:${name}:${i}` })));
    // Import shared and style-walk contexts, including conditional option sets.
    const contexts = collect('shared', shared).concat(overrides.flatMap((entry, i) =>
      collect(`walk:${i}:${entry.walk?.designId || ''}`, entry.walk || {})));
    const contextualQuestions = contexts.map(q => ({
      scope: q.seed_scope, design_id: q.designId || null,
      ...addQuestions(rangeId, `${rangeId}:${q.seed_scope}`, [q], 'shared')[0]
    }));
    for (const style of styles) {
      const source = items[style.slug];
      if (!source) throw new Error(`Missing window item: ${product.folder}/${style.slug}`);
      const id = stableId(`layout:${rangeId}:${style.slug}`);
      const base = addQuestions(rangeId, `${id}:base`, source.questions || [], 'shared');
      const glazed = addQuestions(rangeId, `${id}:glazed`, source.questionsWhenGlazed || [], 'shared');
      rows.layouts.push({
        id, range_id: rangeId, style_id: null, external_id: style.designId,
        slug: style.slug, name: style.name, features: {
          kind: 'layout', source: { ...source, style },
          dimensions: style.dimensions, quantityOfFacets: style.quantityOfFacets,
          question_contexts: base, glazed_question_contexts: glazed,
          catalogue_contexts: contextualQuestions.map(({ id, scope }) => ({ id, scope }))
        },
        view_box: null, squares: style.quantityOfSquares ?? null, active: true
      });
    }
  }
  for (const [table, values] of Object.entries(rows)) {
    if (new Set(values.map(x => x.id)).size !== values.length) throw new Error(`Duplicate seed identities in ${table}`);
  }
  return rows;
}
