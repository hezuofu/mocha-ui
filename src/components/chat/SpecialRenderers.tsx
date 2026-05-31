import { useState, useEffect, useRef } from 'react';

declare global { interface Window { katex?: { render: (s: string, e: HTMLElement, o?: Record<string, unknown>) => void }; mermaid?: { render: (id: string, code: string) => Promise<{ svg: string }>; initialize: (o: Record<string, unknown>) => void }; } }

export function KaTeXRenderer({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderKatex = () => {
      try {
        const el = containerRef.current;
        if (!el || !window.katex?.render) return;
        const html = content
          .replace(/\$\$([\s\S]*?)\$\$/g, (_: string, math: string) => {
            try { const sp = document.createElement('span'); window.katex!.render(math.trim(), sp, { displayMode: true, throwOnError: false }); return sp.outerHTML; }
            catch { return `<code>${math}</code>`; }
          })
          .replace(/\$([^$]+)\$/g, (_: string, math: string) => {
            try { const sp = document.createElement('span'); window.katex!.render(math.trim(), sp, { throwOnError: false }); return sp.outerHTML; }
            catch { return `<code>${math}</code>`; }
          });
        el.innerHTML = html;
      } catch { /* CDN not loaded */ }
    };

    if (!window.katex) {
      const l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css';
      document.head.appendChild(l);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js';
      s.onload = renderKatex; document.head.appendChild(s);
    } else renderKatex();
  }, [content]);

  return <div ref={containerRef} />;
}

export function MermaidRenderer({ code }: { code: string }) {
  const [, setSvg] = useState('');

  useEffect(() => {
    const render = async () => {
      try {
        if (!window.mermaid?.render) return;
        const result = await window.mermaid.render('mermaid-' + Math.random().toString(36).slice(2), code);
        setSvg(result.svg);
      } catch { setSvg(''); }
    };

    if (!window.mermaid) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
      s.onload = () => { window.mermaid?.initialize?.({ startOnLoad: false, theme: 'dark' }); render(); };
      document.head.appendChild(s);
    } else render();
  }, [code]);

  return <pre className="code-block"><code>{code}</code></pre>;
}
