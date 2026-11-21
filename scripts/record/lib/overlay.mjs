// Drawn on top of the page only inside the recorder's own browser, so viewers can follow
// the pointer. Headless capture has no OS cursor and phones show no touches.
// Desktop: a small navy ring that follows the mouse and dips on press.
// Phone: a 44px navy ring at each tap that grows and fades (storyboard production notes).
// Motion keeps to docs/DESIGN.md: short, transform and opacity only.

export function overlayScript({ mode, navy }) {
  return `(() => {
    if (window.__qsRecOverlay) return;
    window.__qsRecOverlay = true;
    const mode = ${JSON.stringify(mode)};
    const navy = ${JSON.stringify(navy)};
    const mount = () => {
      const style = document.createElement('style');
      style.textContent = \`
        #qs-rec-cursor { position: fixed; left: 0; top: 0; pointer-events: none; z-index: 2147483647; will-change: transform; }
        #qs-rec-cursor i { display: block; width: 22px; height: 22px; margin: -11px 0 0 -11px; border: 2px solid \${navy};
          border-radius: 50%; background: rgba(243,239,232,.55); box-shadow: 0 1px 4px rgba(15,23,42,.25);
          transition: transform 80ms ease-in; }
        #qs-rec-cursor.down i { transform: scale(.8); }
        .qs-rec-tap { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px; border: 3px solid \${navy};
          border-radius: 50%; pointer-events: none; z-index: 2147483647; opacity: .9;
          animation: qs-rec-tap 450ms cubic-bezier(.2,0,0,1) forwards; }
        @keyframes qs-rec-tap { from { transform: scale(.6); opacity: .9 } to { transform: scale(1.25); opacity: 0 } }
      \`;
      document.documentElement.appendChild(style);
      if (mode === 'cursor') {
        const dot = document.createElement('div');
        dot.id = 'qs-rec-cursor';
        dot.appendChild(document.createElement('i'));
        document.documentElement.appendChild(dot);
        const place = (x, y) => {
          dot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
          try { sessionStorage.setItem('qs-rec-pos', JSON.stringify([x, y])); } catch {}
        };
        let saved = null;
        try { saved = JSON.parse(sessionStorage.getItem('qs-rec-pos') || 'null'); } catch {}
        if (saved) place(saved[0], saved[1]); else place(innerWidth / 2, innerHeight / 2);
        addEventListener('mousemove', (e) => place(e.clientX, e.clientY), true);
        addEventListener('mousedown', () => dot.classList.add('down'), true);
        addEventListener('mouseup', () => dot.classList.remove('down'), true);
      } else {
        const ring = (x, y) => {
          const r = document.createElement('div');
          r.className = 'qs-rec-tap';
          r.style.left = x + 'px'; r.style.top = y + 'px';
          document.documentElement.appendChild(r);
          setTimeout(() => r.remove(), 500);
        };
        let last = 0;
        const onTouch = (x, y) => { const now = Date.now(); if (now - last < 60) return; last = now; ring(x, y); };
        addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) onTouch(t.clientX, t.clientY); }, true);
        addEventListener('pointerdown', (e) => onTouch(e.clientX, e.clientY), true);
      }
    };
    if (document.documentElement) mount(); else addEventListener('DOMContentLoaded', mount);
  })();`;
}
