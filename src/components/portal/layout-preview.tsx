'use client';

import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import s from './portal.module.css';

// Catalogue SVGs reference stored textures. An <img> blocks those nested
// requests; inline SVG uses the same rendering context as the configurator.
export function LayoutPreview({ src }: { src: string }) {
  const [preview, setPreview] = useState({ src: '', markup: '', error: false });

  useEffect(() => {
    if (!src) return;
    const controller = new AbortController();
    void fetch(src, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Preview unavailable');
      const markup = DOMPurify.sanitize(await response.text(), {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['image'],
        ADD_ATTR: ['xlink:href', 'preserveAspectRatio'],
      });
      if (!markup.includes('<svg')) throw new Error('Preview unavailable');
      if (!controller.signal.aborted) setPreview({ src, markup, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setPreview({ src, markup: '', error: true });
    });
    return () => controller.abort();
  }, [src]);

  if (!src || (preview.src === src && preview.error)) return <span className={s.hint}>Preview unavailable</span>;
  if (preview.src !== src) return <span className={s.hint}>Loading preview…</span>;
  return <span className={s.embedSvg} aria-hidden="true" dangerouslySetInnerHTML={{ __html: preview.markup }} />;
}
