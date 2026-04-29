'use client';

// Optional MathJax overlay used in 2D mode (e.g. share page) to crisply render
// the most recent formula. Inside the 3D scene we render the formula directly
// onto the chalkboard canvas (see lib/board-renderer.ts).

import { MathJax, MathJaxContext } from 'better-react-mathjax';
import type { BoardCommand } from '@/lib/types';

const config = {
  tex: { inlineMath: [['$', '$']], displayMath: [['$$', '$$']] },
  startup: { typeset: false },
};

export function BoardCommandFormulaOverlay({ commands }: { commands: BoardCommand[] }) {
  const lastFormula = [...commands].reverse().find((c) => c.action === 'write_formula');
  if (!lastFormula || lastFormula.action !== 'write_formula') return null;
  return (
    <MathJaxContext version={3} config={config}>
      <div className="rounded-glass border border-white/10 bg-white/[0.04] px-5 py-3 backdrop-blur-glass">
        <MathJax dynamic>{`\\(${lastFormula.latex}\\)`}</MathJax>
      </div>
    </MathJaxContext>
  );
}
