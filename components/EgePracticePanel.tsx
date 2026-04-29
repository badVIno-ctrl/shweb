'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import { GlassButton } from './GlassButton';
import type { EgeTask } from '@/lib/ege-tasks';
import { apiFetch } from '@/lib/api';

interface Problem {
  statement: string;
  answer: string;
  hints: string[];
  solution: string;
}

interface Verdict {
  correct: boolean;
  feedback: string;
}

const MJ_CONFIG = {
  loader: { load: ['input/tex', 'output/svg'] },
  tex: { inlineMath: [['$', '$']] },
};

interface Props {
  task: EgeTask;
}

export function EgePracticePanel({ task }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [showHint, setShowHint] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [streak, setStreak] = useState(0);
  const seenRef = useRef<string[]>([]);

  async function newTask() {
    setLoading(true);
    setVerdict(null);
    setAnswer('');
    setShowHint(0);
    setShowSolution(false);
    try {
      const res = await apiFetch('/api/ege/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          difficulty: 'medium',
          exclude: seenRef.current.slice(-3),
        }),
      });
      const p = (await res.json()) as Problem;
      setProblem(p);
      if (p.statement) seenRef.current.push(p.statement);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setProblem(null);
    setStreak(0);
    seenRef.current = [];
    void newTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  async function check() {
    if (!problem || !answer.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/ege/practice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          statement: problem.statement,
          expected: problem.answer,
          answer: answer.trim(),
        }),
      });
      const v = (await res.json()) as Verdict;
      setVerdict(v);
      if (v.correct) setStreak((s) => s + 1);
      else setStreak(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <MathJaxContext config={MJ_CONFIG}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-widest text-text-muted">
            Практика · №{task.id} · {task.title}
          </div>
          {streak > 0 && (
            <div className="rounded-full border border-accent-gold/30 bg-accent-gold/10 px-2.5 py-0.5 text-xs text-accent-gold">
              серия {streak}🔥
            </div>
          )}
        </div>

        {/* Problem statement */}
        <div className="rounded-glass border border-white/10 bg-white/[0.03] p-4 text-sm md:text-base">
          {!problem && (
            <div className="flex items-center gap-2 text-text-muted">
              <span className="h-1.5 w-1.5 animate-thinking-dot rounded-full bg-aurora-2" />
              {loading ? 'Генерирую задачу…' : 'Нет задачи'}
            </div>
          )}
          {problem && (
            <MathJax dynamic>
              <div className="leading-relaxed text-text-primary">
                {problem.statement}
              </div>
            </MathJax>
          )}
        </div>

        {/* Answer input */}
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && check()}
            placeholder="Ответ"
            className="flex-1 rounded-glass border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-aurora-2/50 focus:outline-none"
            disabled={!problem || loading}
          />
          <GlassButton
            variant="gold"
            size="md"
            onClick={check}
            disabled={!problem || loading || !answer.trim()}
          >
            <Send size={16} strokeWidth={1.5} /> Проверить
          </GlassButton>
        </div>

        {/* Verdict */}
        {verdict && (
          <div
            className={`flex items-start gap-2 rounded-glass border p-3 text-sm ${
              verdict.correct
                ? 'border-aurora-1/40 bg-aurora-1/10 text-aurora-1'
                : 'border-aurora-3/40 bg-aurora-3/10 text-aurora-3'
            }`}
          >
            {verdict.correct ? (
              <CheckCircle2 size={18} strokeWidth={1.5} className="mt-0.5" />
            ) : (
              <XCircle size={18} strokeWidth={1.5} className="mt-0.5" />
            )}
            <div className="text-text-primary">{verdict.feedback}</div>
          </div>
        )}

        {/* Hints + new task row */}
        <div className="flex flex-wrap gap-2">
          {problem && problem.hints.length > 0 && showHint < problem.hints.length && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setShowHint((h) => h + 1)}
            >
              <Lightbulb size={14} strokeWidth={1.5} /> Подсказка{' '}
              {showHint + 1}/{problem.hints.length}
            </GlassButton>
          )}
          {problem?.solution && !showSolution && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setShowSolution(true)}
            >
              Показать решение
            </GlassButton>
          )}
          <div className="ml-auto">
            <GlassButton
              variant="primary"
              size="sm"
              onClick={newTask}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Sparkles size={14} strokeWidth={1.5} /> Генерирую…
                </>
              ) : (
                <>
                  <RefreshCw size={14} strokeWidth={1.5} /> Новая задача
                </>
              )}
            </GlassButton>
          </div>
        </div>

        {/* Hints body */}
        {problem && showHint > 0 && (
          <div className="rounded-glass border border-white/10 bg-white/[0.03] p-3 text-sm text-text-muted">
            {problem.hints.slice(0, showHint).map((h, i) => (
              <div key={i} className="mb-1 last:mb-0">
                <span className="text-aurora-2">› </span>
                {h}
              </div>
            ))}
          </div>
        )}

        {/* Solution */}
        {showSolution && problem?.solution && (
          <div className="rounded-glass border border-white/10 bg-white/[0.03] p-3 text-sm">
            <div className="mb-1 text-xs uppercase tracking-widest text-text-muted">
              Решение
            </div>
            <MathJax dynamic>{problem.solution}</MathJax>
            {problem.answer && (
              <div className="mt-2 text-aurora-1">Ответ: {problem.answer}</div>
            )}
          </div>
        )}
      </div>
    </MathJaxContext>
  );
}
