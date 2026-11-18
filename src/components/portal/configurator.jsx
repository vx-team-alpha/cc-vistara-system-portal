"use client";
import DOMPurify from "dompurify";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  hydrate,
  installAssets,
  resolveAsset,
  doorState,
  windowState,
} from "@/lib/configurator/runtime/adapter.js";
import { renderDoor } from "@/lib/configurator/runtime/rendering.js";
import { renderWindow } from "@/lib/configurator/runtime/window-renderer.js";
import { imageMap, selectWindowOption } from "@/lib/configurator/runtime/windows.js";

import { ConfiguratorSkeleton, DrawingSkeleton } from "./loading-skeletons";

import s from "./portal.module.css";
const empty = { style: "", design_id: "", side_designs: {}, picks: {}, texts: {} };
async function read(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("The catalogue could not be loaded.");
  return response.json();
}
const runtimeCache = new Map();
function runtimeKey(publicKey, layoutId) {
  return `${publicKey}:${layoutId}`;
}
function loadRuntime(publicKey, layoutId) {
  const key = runtimeKey(publicKey, layoutId);
  if (runtimeCache.has(key)) return runtimeCache.get(key);
  const promise = read(`/api/embed/${publicKey}/config?layout=${layoutId}`)
    .then(async (config) => {
      installAssets(config.paths);
      if (config.kind === "door")
        return { ...config, data: hydrate(await read(config.urls.manifest)) };
      const [shared, overrides, materials, images] = await Promise.all(
        ["shared", "overrides", "materials", "images"].map((name) => read(config.urls[name])),
      );
      const originals = Object.fromEntries(
        Object.entries({ ...config.paths, ...materials.assets })
          .filter(([name]) => /^https?:/.test(name) && !name.includes("/storage/v1/"))
          .map(([name, value]) => [value, name]),
      );
      return {
        ...config,
        shared,
        overrides,
        materials: { ...materials, originals },
        images: imageMap(images),
      };
    })
    .catch((error) => {
      runtimeCache.delete(key);
      throw error;
    });
  runtimeCache.set(key, promise);
  if (runtimeCache.size > 12) {
    const oldest = runtimeCache.keys().next().value;
    if (oldest !== key) runtimeCache.delete(oldest);
  }
  return promise;
}
/** @param {{publicKey:string, layoutId:string, onChange:(value: import('@/server/portal/schemas').Configuration|null)=>void, headerAction?:import('react').ReactNode, completionAction?:import('react').ReactNode}} props */
export function Configurator({
  publicKey,
  layoutId,
  onChange,
  headerAction = null,
  completionAction = null,
}) {
  const [runtime, setRuntime] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [configuration, setConfiguration] = useState(empty),
    [internal, setInternal] = useState(false),
    [index, setIndex] = useState(0),
    [query, setQuery] = useState("");
  const optionScroll = useRef(null),
    optionContent = useRef(null);
  const [moreOptions, setMoreOptions] = useState(false);
  const [drawing, setDrawing] = useState({ request: "", markup: "", error: "" });
  useEffect(() => {
    let active = true;
    if (retry) runtimeCache.delete(runtimeKey(publicKey, layoutId));
    loadRuntime(publicKey, layoutId)
      .then((value) => {
        if (active) {
          setRuntime(value);
          setError("");
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [publicKey, layoutId, retry]);
  const state = useMemo(
    () =>
      runtime
        ? runtime.kind === "door"
          ? doorState(runtime.data, runtime.source, configuration)
          : windowState(
              runtime.source,
              runtime.shared,
              runtime.overrides,
              configuration.picks,
              runtime.images,
            )
        : null,
    [runtime, configuration],
  );
  const normalized = JSON.stringify(
    state
      ? {
          ...configuration,
          style: state.style || "",
          design_id: state.design?.designId || "",
          picks: state.picks,
        }
      : null,
  );
  useEffect(() => {
    onChange(JSON.parse(normalized));
  }, [normalized, onChange]);
  const request = JSON.stringify([layoutId, configuration, internal, runtime?.kind, retry]);
  useEffect(() => {
    if (!runtime || !state) return;
    const controller = new AbortController();
    const render = async () => {
      if (runtime.kind === "door")
        return renderDoor({
          data: runtime.data,
          layout: runtime.source,
          design: state.design,
          sideDesigns: state.sides,
          questions: state.questions,
          picks: state.picks,
          texts: configuration.texts,
          internal,
        });
      const face =
        runtime.source.images?.find((image) => image.type === (internal ? 2 : 1)) ||
        runtime.source.images?.[0];
      const url = resolveAsset(runtime.paths, face?.path || runtime.source.style?.styleSvg);
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("The window drawing could not be loaded.");
      return renderWindow(
        await response.text(),
        state.questions,
        state.picks,
        internal,
        runtime.materials,
        runtime.source,
      );
    };
    render()
      .then((markup) => {
        if (!controller.signal.aborted)
          setDrawing({
            request,
            markup: DOMPurify.sanitize(markup, {
              USE_PROFILES: { svg: true, svgFilters: true },
              ADD_TAGS: ["image"],
              ADD_ATTR: ["xlink:href", "preserveAspectRatio"],
            }),
            error: "",
          });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setDrawing({ request, markup: "", error: e.message });
      });
    return () => controller.abort();
  }, [runtime, state, configuration.texts, internal, request]);
  useEffect(() => {
    const viewport = optionScroll.current,
      content = optionContent.current;
    if (!viewport || !content) return;
    viewport.scrollTop = 0;
    const update = () =>
      setMoreOptions(viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop > 2);
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(content);
    viewport.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", update);
    };
  }, [runtime, index, query, state?.questions.length]);
  if (error)
    return (
      <div className={s.notice} data-error role="alert">
        {error}
        <button className={s.btn} type="button" onClick={() => setRetry((v) => v + 1)}>
          Try again
        </button>
      </div>
    );
  if (!runtime || !state) return <ConfiguratorSkeleton />;
  const question = state.questions[Math.min(index, Math.max(0, state.questions.length - 1))];
  const active = state.questions.findIndex((q) => q.key === question?.key);
  const numberQuestion = state.questions.find((q) => q.originalName === "House Number");
  const textQuestion =
    question?.originalName === "Numeral" ? numberQuestion : question?.hasText ? question : null;
  const options = (question?.options || []).filter((o) =>
    (o.description || "").toLowerCase().includes(query.toLowerCase()),
  );
  function pick(option) {
    let next = { ...configuration, picks: { ...state.picks, [question.key]: option.id } };
    if (runtime.kind === "door") {
      if (question.originalName === "Door Range") next = { ...empty, style: option.description };
      if (question.originalName === "Door Design (Door)") next.design_id = option.id;
      if (question.originalName === "Door Design (Side)")
        next.side_designs = { ...configuration.side_designs, [question.section]: option.id };
    } else
      next.picks = selectWindowOption(
        runtime.source,
        state.catalogues,
        state.picks,
        question,
        option,
      );
    setConfiguration(next);
    if (
      /\(Internal\)|Handle \(Casement\)/.test(question.name) ||
      (runtime.kind !== "door" && /Hardware Colour/.test(question.name))
    )
      setInternal(true);
  }
  return (
    <section className={s.configurator} aria-label="Product configuration">
      <div className={s.elevationPanel}>
        <div className={s.toolbar}>
          <strong>{internal ? "Inside view" : "Outside view"}</strong>
          <button type="button" className={s.btn} onClick={() => setInternal(!internal)}>
            View {internal ? "outside" : "inside"}
          </button>
        </div>
        <div className={s.elevation} aria-busy={drawing.request !== request}>
          {drawing.request !== request ? (
            <DrawingSkeleton />
          ) : drawing.error ? (
            <p role="alert">
              {drawing.error}
              <button className={s.btn} type="button" onClick={() => setRetry((v) => v + 1)}>
                Retry drawing
              </button>
            </p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: drawing.markup }} />
          )}
        </div>
        <p className={s.hint}>
          Catalogue sizes shown in millimetres. Elevation is illustrative and not to scale; product
          availability will be confirmed by the team.
        </p>
      </div>
      <div className={s.optionPanel}>
        {question ? (
          <>
            <div className={s.optionHeader}>
              <div className={s.optionMeta}>
                <span className={s.hint}>
                  Option {active + 1} of {state.questions.length}
                </span>
                {headerAction}
              </div>
              <select
                className={s.select}
                aria-label="Jump to configuration option"
                value={active}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setQuery("");
                }}
              >
                {state.questions.map((q, i) => (
                  <option key={q.key} value={i}>
                    {q.name}
                  </option>
                ))}
              </select>
            </div>
            <h2 className={s.cardTitle}>{question.name.replace(" (Door)", "")}</h2>
            <div className={s.optionScrollFrame} data-more={moreOptions}>
              <div
                ref={optionScroll}
                className={s.optionScroll}
                tabIndex={0}
                role="region"
                aria-label="Available options"
              >
                <div ref={optionContent}>
                  {(question.options || []).length > 12 && (
                    <div className={s.field}>
                      <label className={s.label} htmlFor="option-search">
                        Find an option
                      </label>
                      <input
                        id="option-search"
                        className={s.input}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search options"
                      />
                    </div>
                  )}
                  <div className={s.optionList}>
                    {options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={s.optionTile}
                        aria-pressed={state.picks[question.key] === o.id}
                        onClick={() => pick(o)}
                      >
                        {o.src && (
                          <span className={s.optionMedia}>
                            <Image
                              unoptimized
                              width={120}
                              height={104}
                              className={s.optionImage}
                              src={resolveAsset(runtime.paths, o.src)}
                              alt=""
                            />
                          </span>
                        )}
                        <span className={s.optionName}>{o.description}</span>
                      </button>
                    ))}
                    {!options.length && <p className={s.hint}>No matching options.</p>}
                  </div>
                  {textQuestion && (
                    <div className={s.field}>
                      <label className={s.label} htmlFor="option-text">
                        {textQuestion.name}
                      </label>
                      <input
                        data-test="house-number-input"
                        id="option-text"
                        className={s.input}
                        value={configuration.texts[textQuestion.key] || ""}
                        maxLength={
                          textQuestion.validation?.maxLength > 0
                            ? textQuestion.validation.maxLength
                            : 100
                        }
                        onChange={(e) =>
                          setConfiguration({
                            ...configuration,
                            texts: { ...configuration.texts, [textQuestion.key]: e.target.value },
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className={s.actions}>
              <button
                type="button"
                className={s.btn}
                disabled={active === 0}
                onClick={() => {
                  setIndex(Math.max(0, active - 1));
                  setQuery("");
                }}
              >
                Previous
              </button>
              {active === state.questions.length - 1 ? (
                completionAction
              ) : (
                <button
                  type="button"
                  className={`${s.btn} ${s.btnPrimary}`}
                  onClick={() => {
                    setIndex(active + 1);
                    setQuery("");
                  }}
                >
                  Next option
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {headerAction}
            <p>No additional options are available for this product.</p>
            {completionAction}
          </>
        )}
      </div>
    </section>
  );
}
