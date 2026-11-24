"use client";
import DOMPurify from "dompurify";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const empty = { style: "", design_id: "", side_designs: {}, picks: {}, texts: {} };
async function read(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("The catalogue could not be loaded.");
  return response.json();
}
const runtimeCache = new Map();
function runtimeKey(sourceKey, layoutId) {
  return `${sourceKey}:${layoutId}`;
}
function loadRuntime(sourceKey, layoutId, configUrl) {
  const key = runtimeKey(sourceKey, layoutId);
  if (runtimeCache.has(key)) return runtimeCache.get(key);
  const promise = read(`${configUrl}?layout=${layoutId}`)
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

/** @param {{publicKey?:string, configUrl?:string, layoutId:string, onChange:(value: import('@/server/portal/schemas').Configuration|null)=>void, onDrawingChange?:(value:string, internal:boolean)=>void, headerAction?:import('react').ReactNode, completionAction?:import('react').ReactNode, frameDetails?:import('@/server/portal/schemas').Configuration['frame'], initialConfiguration?:import('@/server/portal/schemas').Configuration|null}} props */
export function Configurator({
  publicKey,
  configUrl,
  layoutId,
  onChange,
  onDrawingChange,
  headerAction = null,
  completionAction = null,
  frameDetails = null,
  initialConfiguration = null,
}) {
  const [runtime, setRuntime] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [configuration, setConfiguration] = useState(() => ({
      ...empty,
      ...(initialConfiguration || {}),
      side_designs: { ...empty.side_designs, ...(initialConfiguration?.side_designs || {}) },
      picks: { ...empty.picks, ...(initialConfiguration?.picks || {}) },
      texts: { ...empty.texts, ...(initialConfiguration?.texts || {}) },
    })),
    [internal, setInternal] = useState(false),
    [index, setIndex] = useState(0),
    [query, setQuery] = useState("");
  const optionScroll = useRef(null);
  const [drawing, setDrawing] = useState({ request: "", markup: "", error: "" });
  const runtimeSource = configUrl || `/api/embed/${publicKey}/config`;
  useEffect(() => {
    let active = true;
    if (retry) runtimeCache.delete(runtimeKey(runtimeSource, layoutId));
    loadRuntime(runtimeSource, layoutId, runtimeSource)
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
  }, [runtimeSource, layoutId, retry]);
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
  const normalized = useMemo(() => {
    if (!state) return null;
    const particulars = (state.questions || []).map((q) => {
      const selected = (q.options || []).find((o) => o.id === state.picks[q.key]);
      const text = configuration.texts[q.key] || "";
      return {
        question: q.name?.replace(/\s*\((Door|Side|Casement)\)$/g, "") || q.name,
        original_name: q.originalName || q.name,
        section: q.section || "",
        answer: text || selected?.description || "—",
      };
    });
    return JSON.stringify({
      ...configuration,
      style: state.style || "",
      design_id: state.design?.designId || "",
      design_name:
        state.design?.designName ||
        state.design?.title ||
        state.design?.name ||
        state.design?.design ||
        "",
      picks: state.picks,
      particulars,
    });
  }, [state, configuration]);

  useEffect(() => {
    if (normalized) {
      onChange(JSON.parse(normalized));
    }
  }, [normalized, onChange]);

  useEffect(() => {
    if (drawing.markup && typeof window !== "undefined") {
      try {
        sessionStorage.setItem("frontage:last-door-drawing", drawing.markup);
      } catch {}
    }
  }, [drawing.markup]);

  const request = JSON.stringify([layoutId, configuration, internal, runtime?.kind, retry]);
  useEffect(() => {
    onDrawingChange?.(drawing.request === request ? drawing.markup : "", internal);
  }, [drawing.markup, drawing.request, onDrawingChange, request, internal]);
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
          frameDetails,
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
  }, [runtime, state, configuration.texts, internal, request, frameDetails]);
  useEffect(() => {
    if (optionScroll.current) optionScroll.current.scrollTop = 0;
  }, [runtime, index, query, state?.questions.length]);

  if (error)
    return (
      <div
        className="flex items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive"
        role="alert"
      >
        <span>{error}</span>
        <Button variant="outline" size="sm" type="button" onClick={() => setRetry((v) => v + 1)}>
          Try again
        </Button>
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
    <section
      className="mt-5 grid h-auto grid-cols-1 items-stretch gap-5 md:h-[min(720px,calc(100svh-160px))] md:max-h-[min(720px,calc(100svh-160px))] md:grid-cols-2"
      aria-label="Product configuration"
    >
      <div className="flex min-h-0 min-w-0 flex-col overflow-visible rounded-2xl border border-border bg-card p-5 shadow-xs md:overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/60 pb-3">
          <strong className="text-sm font-semibold text-brand-txt-primary">
            {internal ? "Inside view" : "Outside view"}
          </strong>
          <Button variant="outline" size="sm" type="button" onClick={() => setInternal(!internal)}>
            View {internal ? "outside" : "inside"}
          </Button>
        </div>
        <div
          className="elevation-canvas grid min-h-[300px] flex-1 place-items-center py-4 md:min-h-0 [&_div]:h-full [&_div]:min-h-0 [&_div]:w-full [&_svg]:block [&_svg]:h-[300px] [&_svg]:w-full md:[&_svg]:h-full md:[&_svg]:max-h-[420px]"
          aria-busy={drawing.request !== request}
        >
          {drawing.request !== request ? (
            <DrawingSkeleton widthMm={frameDetails?.width_mm} heightMm={frameDetails?.height_mm} />
          ) : drawing.error ? (
            <div role="alert" className="p-4 text-center">
              <p className="mb-3 text-sm text-destructive">{drawing.error}</p>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setRetry((v) => v + 1)}
              >
                Retry drawing
              </Button>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: drawing.markup }} />
          )}
        </div>
        <p className="shrink-0 border-t border-border/40 pt-3 text-xs text-muted-foreground">
          Catalogue sizes shown in millimetres. Elevation is illustrative and not to scale; product
          availability will be confirmed by the team.
        </p>
      </div>
      <div className="flex max-h-[min(520px,calc(100svh-8rem))] min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs md:max-h-none">
        {question ? (
          <>
            <div className="grid shrink-0 gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Option {active + 1} of {state.questions.length}
                </span>
                {headerAction}
              </div>
              <Select
                value={String(active)}
                onValueChange={(val) => {
                  setIndex(Number(val));
                  setQuery("");
                }}
              >
                <SelectTrigger
                  className="h-9 min-w-[200px] bg-background"
                  aria-label="Jump to configuration option"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {state.questions.map((q, i) => (
                    <SelectItem key={q.key} value={String(i)}>
                      {q.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <h2 className="text-title-2 mt-3 mb-2 font-bold text-brand-txt-primary">
              {question.name.replace(" (Door)", "")}
            </h2>
            <div className="min-h-0 flex-1 overflow-hidden">
              <div
                ref={optionScroll}
                className="h-full overflow-y-auto overscroll-contain rounded-lg pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                tabIndex={0}
                role="region"
                aria-label="Available options"
              >
                <div>
                  {(question.options || []).length > 12 && (
                    <div className="mb-3.5 grid gap-1.5">
                      <label
                        className="text-xs font-medium text-brand-txt-primary"
                        htmlFor="option-search"
                      >
                        Find an option
                      </label>
                      <Input
                        id="option-search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search options"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,136px),1fr))] items-start gap-2.5 p-1">
                    {options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className="group relative flex min-h-[52px] min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card p-0 text-left text-xs leading-snug transition-all hover:border-brand-txt-primary hover:bg-muted/50 aria-pressed:border-brand-txt-primary aria-pressed:ring-2 aria-pressed:ring-brand-txt-primary"
                        aria-pressed={state.picks[question.key] === o.id}
                        onClick={() => pick(o)}
                      >
                        {o.src && (
                          <span className="grid h-[124px] w-full place-items-center overflow-hidden bg-muted/40 p-3 shadow-[inset_0_-1px_0_var(--border)]">
                            <Image
                              unoptimized
                              width={120}
                              height={104}
                              className="block h-full min-h-0 w-full object-contain"
                              src={resolveAsset(runtime.paths, o.src)}
                              alt=""
                            />
                          </span>
                        )}
                        <span className="flex min-h-[50px] w-full flex-1 items-center p-2.5 break-words text-brand-txt-primary group-aria-pressed:font-semibold">
                          {o.description}
                        </span>
                      </button>
                    ))}
                    {!options.length && (
                      <p className="p-2 text-xs text-muted-foreground">No matching options.</p>
                    )}
                  </div>
                  {textQuestion && (
                    <div className="mt-3.5 mb-2 grid gap-1.5">
                      <label
                        className="text-xs font-medium text-brand-txt-primary"
                        htmlFor="option-text"
                      >
                        {textQuestion.name}
                      </label>
                      <Input
                        data-test="house-number-input"
                        id="option-text"
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
            <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={active === 0}
                onClick={() => {
                  setIndex(Math.max(0, active - 1));
                  setQuery("");
                }}
              >
                Previous
              </Button>
              {active === state.questions.length - 1 ? (
                completionAction
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIndex(active + 1);
                    setQuery("");
                  }}
                >
                  Next option
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {headerAction}
            <p className="my-auto text-center text-sm text-muted-foreground">
              No additional options are available for this product.
            </p>
            {completionAction}
          </>
        )}
      </div>
    </section>
  );
}
