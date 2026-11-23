import { hydrate, doorState, windowState, installAssets } from "./adapter.js";
export async function validateConfiguration(runtime, configuration) {
  installAssets(runtime.paths);
  const source = runtime.source;
  let state;
  if (runtime.kind === "door") {
    const data = hydrate(await runtime.read("/catalogue/manifest.json"));
    if (
      configuration.style &&
      !Object.hasOwn(data.designs[source.range] || {}, configuration.style)
    )
      throw new Error("Choose a valid door style.");
    state = doorState(data, source, configuration);
    if (configuration.design_id && configuration.design_id !== state.design.designId)
      throw new Error("Choose a design from the selected range.");
  } else {
    const folder = runtime.layout.product_ranges.slug.replace(/^advance70-/, "");
    const [shared, overrides] = await Promise.all([
      runtime.read(`/window-data/${folder}/questions.json`),
      runtime.read(`/window-data/${folder}/questions-by-style.json`),
    ]);
    state = windowState(source, shared, overrides, configuration.picks);
  }
  for (const [key, id] of Object.entries(configuration.picks)) {
    const question = state.questions.find((q) => q.key === key);
    if (!question || !question.options.some((o) => o.id === id))
      throw new Error("Some selections are no longer available. Please review your configuration.");
  }
  for (const key of Object.keys(configuration.texts)) {
    if (!state.questions.some((q) => q.key === key && q.hasText))
      throw new Error("This text field is not part of the active configuration.");
  }
  const particulars = [];
  const texts = {};
  for (const question of state.questions) {
    const selected = question.options.find((o) => o.id === state.picks[question.key]);
    const text = configuration.texts[question.key] || "";
    if (text) {
      if (!question.hasText) throw new Error("Text is not supported for this option.");
      const limit = question.validation?.maxLength > 0 ? question.validation.maxLength : 100;
      if (text.length > limit) throw new Error(`${question.name} is too long.`);
      if (question.validation?.regex && !new RegExp(question.validation.regex).test(text))
        throw new Error(`Please check ${question.name}.`);
      texts[question.key] = text;
    }
    particulars.push({
      question: question.name,
      original_name: question.originalName || question.name,
      section: question.section || "",
      option_id: selected?.id || null,
      answer: text || selected?.description || "",
    });
  }
  return {
    side_designs: Object.fromEntries(
      Object.entries(state.sides || {}).map(([section, side]) => [section, side.designId]),
    ),
    style: state.style || null,
    design_id: state.design?.designId || null,
    design_name: state.design?.title || state.design?.name || state.design?.design || "",
    picks: state.picks,
    texts,
    particulars,
  };
}
