const ROOT = "advance70-casement/";

export function assetUrl(storedPath) {
  if (!storedPath) return "";
  const index = storedPath.indexOf(ROOT);
  if (index === -1) return storedPath;
  return `/window-data/${storedPath.slice(index + ROOT.length)}`;
}

export function imageMap(rows) {
  const map = {};
  for (const row of rows || []) {
    if (row?.url && row?.path) map[row.url] = assetUrl(row.path);
  }
  return map;
}

export function cataloguesFrom(questionsFile, byStyle) {
  const rows = [];
  if (questionsFile?.questions) rows.push(questionsFile);
  for (const entry of byStyle || []) {
    if (entry?.walk?.questions) rows.push(entry.walk);
  }
  return rows;
}

function questionKey(question) {
  const components = (question.components || []).map((component) => component.id).filter(Boolean).join(",");
  return `${question.name}|${question.optionHeadingId || ""}|${components}|`;
}

function prepare(question, images) {
  const options = (question.options || []).map((option) => ({
    ...option,
    src: option.imageUrl ? images[option.imageUrl] || "" : "",
  }));
  return {
    ...question,
    key: questionKey(question),
    options,
  };
}

export function chosenLabel(question, picks) {
  const picked = question.options.find((option) => option.id === picks[question.key]);
  if (picked) return picked.description;
  return (question.options.find((option) => option.isCurrentOption) || question.options[0])?.description || "";
}

function answersFor(questions, picks) {
  const answers = {};
  for (const question of questions) {
    const label = chosenLabel(question, picks);
    if (label) answers[question.name] = label;
  }
  return answers;
}

function matches(when, answers) {
  const entries = Object.entries(when || {});
  return entries.length > 0 && entries.every(([name, value]) => answers[name] === value);
}

function bestContext(contexts, answers) {
  const matched = contexts.filter((context) => matches(context.when, answers));
  matched.sort((a, b) => Object.keys(b.when || {}).length - Object.keys(a.when || {}).length);
  return matched[0] || null;
}

function fromContext(name, context, images) {
  return prepare({
    name,
    optionHeadingId: context.optionHeadingId,
    consumerListOrder: context.consumerListOrder || 0,
    listOrder: context.listOrder,
    visibilityTypeId: context.visibilityTypeId,
    hasText: context.hasText,
    validation: context.validation,
    components: [],
    instantSelectionOptionItemId: context.instantSelectionOptionItemId,
    options: context.options || [],
  }, images);
}

export function visibleQuestions(item, catalogues, picks, images = {}) {
  if (!item || item.error) return [];
  const isWalkthroughQuestion = question => question.visibilityTypeId !== 1 && (question.options || []).length > 0;
  const baseSource = (item.questions || []).filter(isWalkthroughQuestion);
  const base = baseSource.map((question) => prepare(question, images));
  const answers = answersFor(base, picks);
  const source = answers["Glazing Method"] === "Glazed" && item.questionsWhenGlazed?.length
    ? item.questionsWhenGlazed.filter(isWalkthroughQuestion)
    : baseSource;
  const questions = source.map((question) => prepare(question, images));
  const current = answersFor(questions, picks);
  const extras = [];

  for (const catalogue of catalogues || []) {
    for (const [name, entry] of Object.entries(catalogue.questions || {})) {
      const context = bestContext(entry.contexts || [], current);
      if (!context || !isWalkthroughQuestion(context)) continue;
      const next = fromContext(name, context, images);
      const sameName = questions.filter((question) => question.name === name);
      if (sameName.length === 1) {
        sameName[0].options = next.options.length ? next.options : sameName[0].options;
        sameName[0].hasText = next.hasText;
        sameName[0].validation = next.validation || sameName[0].validation;
        continue;
      }
      if (sameName.length > 1) continue;
      if (!extras.some((question) => question.name === name)) extras.push(next);
    }
  }

  // The source sidebar uses a stable listOrder sort in this portal.
  // consumerListOrder belongs to a different, optional portal mode.
  return [...questions, ...extras].sort((a, b) => (a.listOrder ?? Number.MAX_SAFE_INTEGER) - (b.listOrder ?? Number.MAX_SAFE_INTEGER));
}

export function optionLabel(option) {
  return option?.label || option?.description || "";
}

export function reconcileWindowPicks(item, catalogues, picks) {
  let next = { ...picks };
  for (let pass = 0; pass < 4; pass++) {
    const visible = visibleQuestions(item, catalogues, next);
    const valid = Object.fromEntries(visible.filter(q => q.options.some(o => o.id === next[q.key])).map(q => [q.key, next[q.key]]));
    if (JSON.stringify(valid) === JSON.stringify(next)) break;
    next = valid;
  }
  return next;
}

export function isInternalWindowQuestion(name = '') {
  return /\(Internal\)/.test(name) || name === 'Hardware Colour' || name === 'Handle (Casement)';
}

export function selectWindowOption(item, catalogues, picks, question, option) {
  let next = { ...picks, [question.key]: option.id };
  if (question.name === 'Hardware Colour') {
    const before = visibleQuestions(item, catalogues, picks).find(q => q.name === 'Handle (Casement)');
    const family = before && /Monkey Tail/.test(chosenLabel(before, picks)) ? 'Monkey Tail' : 'Inline';
    const after = visibleQuestions(item, catalogues, next).find(q => q.name === 'Handle (Casement)');
    const handle = after?.options.find(o => o.description.includes(family));
    if (handle) next[after.key] = handle.id;
  }
  return reconcileWindowPicks(item, catalogues, next);
}
