"use client";
import { useSyncExternalStore, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import s from "./portal.module.css";
const subscribe = () => () => {};
export function EmbedCode({ publicKey, name }: { publicKey: string; name: string }) {
  const origin = useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
  const [message, setMessage] = useState("");
  const link = `${origin}/embed/${publicKey}`;
  const safeName = name
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const snippet = `<iframe src="${link}" title="${safeName}" width="100%" height="780" scrolling="no" style="display:block;width:100%;height:780px;border:0;overflow:hidden" loading="lazy"></iframe>
<script>
(() => {
  const frame = document.currentScript.previousElementSibling;
  window.addEventListener('message', event => {
    const data = event.data;
    if (event.source !== frame.contentWindow || data?.type !== 'vistara:resize' || data.key !== '${publicKey}') return;
    const height = Math.min(50000, Math.max(1, Math.ceil(Number(data.height))));
    if (Number.isFinite(height)) frame.style.height = height + 'px';
  });
})();
</script>`;
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied to clipboard.");
    } catch {
      setMessage("Copy was unavailable. Select the code above and copy it manually.");
    }
  }
  return (
    <>
      <p className={s.cardNote}>
        Paste this code into an HTML block on your website. It automatically follows the component’s
        height, so visitors never get a scrollbar inside the embed.
      </p>
      <div className={s.field}>
        <label className={s.label} htmlFor="embed-code">
          Responsive embed code
        </label>
        <Textarea
          id="embed-code"
          readOnly
          value={snippet}
          onFocus={(e) => e.target.select()}
          rows={6}
          className="font-mono text-xs"
        />
      </div>
      <div className={s.actions}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!origin}
          onClick={() => copy(snippet)}
          data-test="copy-embed"
        >
          Copy embed code
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={link} target="_blank" rel="noreferrer">
            Open preview
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={!origin}
          onClick={() => copy(link)}
        >
          Copy public link
        </Button>
      </div>
      {message && (
        <p role="status" className={s.notice}>
          {message}
        </p>
      )}
      <p className={s.hint}>
        Preview visits count as tracked sessions. Pausing this component also pauses its public
        link.
      </p>
    </>
  );
}
