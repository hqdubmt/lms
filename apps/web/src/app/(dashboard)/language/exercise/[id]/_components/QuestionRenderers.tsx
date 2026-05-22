'use client';

import { useState } from 'react';
import { Check, X, Volume2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LangQuestion as Question } from '@/types/language';

interface QuestionProps {
  q: Question;
  answer: any;
  onAnswer: (a: any) => void;
  submitted: boolean;
  result?: { correct: boolean; correctAnswer: any };
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────
export function MultipleChoice({ q, answer, onAnswer, submitted, result }: QuestionProps) {
  return (
    <div className="space-y-3">
      {(q.options || []).map((opt, i) => {
        let cls = 'w-full text-left border-2 rounded-xl px-4 py-3 text-sm font-medium transition-all flex items-center gap-3';
        if (!submitted) {
          cls += answer === opt ? ' border-primary bg-primary/10' : ' border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer';
        } else {
          if (opt === result?.correctAnswer) cls += ' border-green-500 bg-green-50 text-green-700';
          else if (opt === answer && !result?.correct) cls += ' border-red-500 bg-red-50 text-red-700';
          else cls += ' border-border opacity-50';
        }
        return (
          <button key={i} className={cls} disabled={submitted} onClick={() => !submitted && onAnswer(opt)}>
            <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold shrink-0">
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
            {submitted && opt === result?.correctAnswer && <Check className="h-4 w-4 ml-auto text-green-600" />}
            {submitted && opt === answer && !result?.correct && <X className="h-4 w-4 ml-auto text-red-600" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Fill Blank ───────────────────────────────────────────────────────────────
export function FillBlank({ q, answer, onAnswer, submitted, result }: QuestionProps) {
  const [localValue, setLocalValue] = useState(answer || '');
  const parts = q.content.split('___');
  return (
    <div className="space-y-4">
      <div className="text-lg flex items-center flex-wrap gap-1">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <Input
                className={cn('inline-block w-32 mx-1 text-center font-semibold',
                  submitted && result?.correct ? 'border-green-500 bg-green-50 text-green-700' :
                  submitted && !result?.correct ? 'border-red-500 bg-red-50 text-red-700' : '')}
                value={localValue}
                onChange={e => {
                  if (submitted) return;
                  setLocalValue(e.target.value);
                  onAnswer(e.target.value);
                }}
                disabled={submitted}
                placeholder="..."
              />
            )}
          </span>
        ))}
      </div>
      {submitted && !result?.correct && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          Đáp án đúng: <strong>{result?.correctAnswer}</strong>
        </p>
      )}
    </div>
  );
}

// ─── Matching ─────────────────────────────────────────────────────────────────
export function Matching({ q, answer, onAnswer, submitted, result }: QuestionProps) {
  const pairs = q.answer as Record<string, string>;
  const lefts = Object.keys(pairs);
  const [rights] = useState(() => Object.values(pairs).sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>(answer || {});

  const handleLeft = (l: string) => { if (submitted) return; setSelected(l); };
  const handleRight = (r: string) => {
    if (!selected || submitted) return;
    const newMatch = { ...matched, [selected]: r };
    setMatched(newMatch); setSelected(null); onAnswer(newMatch);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        {lefts.map(l => (
          <button key={l} onClick={() => handleLeft(l)}
            className={cn('w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
              selected === l ? 'border-primary bg-primary/10' :
              matched[l] ? 'border-green-400 bg-green-50' : 'border-border hover:border-primary/50')}>
            {l}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {rights.map(r => {
          const matchedKey = Object.entries(matched).find(([, v]) => v === r)?.[0];
          const correct = submitted && pairs[matchedKey || ''] === r;
          const wrong = submitted && matchedKey && !correct;
          return (
            <button key={r} onClick={() => handleRight(r)}
              className={cn('w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                correct ? 'border-green-500 bg-green-50 text-green-700' :
                wrong ? 'border-red-500 bg-red-50 text-red-700' :
                matchedKey ? 'border-blue-400 bg-blue-50' : 'border-border hover:border-primary/50')}>
              {r}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Word Order ───────────────────────────────────────────────────────────────
export function WordOrder({ q, answer, onAnswer, submitted, result }: QuestionProps) {
  const words = q.options as string[] || [];
  const [selected, setSelected] = useState<string[]>(answer || []);
  const [pool, setPool] = useState<string[]>(words.filter(w => !(answer || []).includes(w)));

  const addWord = (w: string) => {
    if (submitted) return;
    const newSel = [...selected, w];
    const idx = pool.indexOf(w);
    const newPool = pool.filter((_, i) => i !== idx);
    setSelected(newSel); setPool(newPool); onAnswer(newSel);
  };
  const removeWord = (i: number) => {
    if (submitted) return;
    const w = selected[i];
    setPool([...pool, w]); const newSel = [...selected]; newSel.splice(i, 1); setSelected(newSel); onAnswer(newSel);
  };

  return (
    <div className="space-y-4">
      <div className="min-h-14 border-2 border-dashed rounded-xl p-3 flex flex-wrap gap-2 bg-muted/30">
        {selected.length === 0 && <span className="text-muted-foreground text-sm m-auto">Chọn từ bên dưới để sắp xếp câu</span>}
        {selected.map((w, i) => (
          <button key={i} onClick={() => removeWord(i)} disabled={submitted}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              submitted && JSON.stringify(selected) === JSON.stringify(result?.correctAnswer)
                ? 'bg-green-100 border-2 border-green-400 text-green-700'
                : submitted ? 'bg-red-100 border-2 border-red-400 text-red-700'
                : 'bg-white border-2 border-primary/30 hover:border-red-300 hover:bg-red-50')}>
            {w}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map((w, i) => (
          <button key={i} onClick={() => addWord(w)} disabled={submitted}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muted border-2 border-border hover:border-primary hover:bg-primary/10 transition-all">
            {w}
          </button>
        ))}
      </div>
      {submitted && !result?.correct && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          Đáp án đúng: <strong>{(result?.correctAnswer as string[])?.join(' ')}</strong>
        </p>
      )}
    </div>
  );
}

// ─── Dictation ────────────────────────────────────────────────────────────────
export function Dictation({ q, answer, onAnswer, submitted, result }: QuestionProps) {
  const [localValue, setLocalValue] = useState(answer || '');
  const playAudio = () => {
    if (q.audioUrl) { new Audio(q.audioUrl).play(); return; }
    const utt = new SpeechSynthesisUtterance(String(q.answer));
    utt.lang = 'en'; window.speechSynthesis.speak(utt);
  };
  return (
    <div className="space-y-4">
      <button onClick={playAudio} className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-primary/10 border-2 border-primary/20 hover:bg-primary/20 transition-all mx-auto">
        <Volume2 className="h-8 w-8 text-primary" />
        <span className="font-semibold text-primary">Nghe và viết lại</span>
      </button>
      <Input
        placeholder="Gõ những gì bạn nghe được..."
        value={localValue}
        onChange={e => {
          if (submitted) return;
          setLocalValue(e.target.value);
          onAnswer(e.target.value);
        }}
        disabled={submitted}
        className={cn('text-lg text-center h-12',
          submitted && result?.correct ? 'border-green-500 bg-green-50 text-green-700' :
          submitted ? 'border-red-500 bg-red-50 text-red-700' : '')}
      />
      {submitted && !result?.correct && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 text-center">
          Đáp án đúng: <strong>{result?.correctAnswer}</strong>
        </p>
      )}
    </div>
  );
}
