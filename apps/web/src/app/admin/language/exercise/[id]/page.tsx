'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Trash2, Loader2, X, GripVertical, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { EXERCISE_TYPE_LABEL as TYPE_LABEL } from '@/constants/language';

interface Question {
  id: string; content: string; audioUrl?: string; options?: string[];
  answer: any; explanation?: string; points: number; order: number;
}
interface Exercise { id: string; title: string; type: string; language: string; level: string; questions: Question[]; }


function QuestionForm({ type, onAdd }: { type: string; onAdd: (q: Partial<Question>) => Promise<void> }) {
  const [content, setContent] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState<any>('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  // Matching state
  const [pairs, setPairs] = useState([{ left: '', right: '' }, { left: '', right: '' }]);

  // Word order state
  const [sentence, setSentence] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let q: Partial<Question> = { content, explanation, points: 1, order: 0 };

    if (type === 'MULTIPLE_CHOICE') {
      q.options = options.filter(Boolean);
      q.answer = answer;
    } else if (type === 'FILL_BLANK') {
      q.answer = answer;
    } else if (type === 'MATCHING') {
      const valid = pairs.filter(p => p.left && p.right);
      q.content = 'Ghép cặp các từ/cụm từ tương ứng';
      q.answer = Object.fromEntries(valid.map(p => [p.left, p.right]));
    } else if (type === 'WORD_ORDER') {
      const words = sentence.split(' ').filter(Boolean);
      q.content = content || 'Sắp xếp các từ thành câu hoàn chỉnh';
      q.options = [...words].sort(() => Math.random() - 0.5);
      q.answer = words;
    } else if (type === 'DICTATION') {
      q.content = 'Nghe và viết lại';
      q.answer = answer;
    }

    await onAdd(q);
    setContent(''); setOptions(['', '', '', '']); setAnswer(''); setExplanation(''); setSentence(''); setPairs([{ left: '', right: '' }, { left: '', right: '' }]);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {type !== 'MATCHING' && type !== 'WORD_ORDER' && type !== 'DICTATION' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {type === 'FILL_BLANK' ? 'Câu có chỗ trống (dùng ___ để đánh dấu)' : 'Câu hỏi'}
          </label>
          <Input value={content} onChange={e => setContent(e.target.value)}
            placeholder={type === 'FILL_BLANK' ? 'VD: The weather is ___ today.' : 'VD: What does "beautiful" mean?'} required />
        </div>
      )}

      {type === 'MULTIPLE_CHOICE' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground block">Các lựa chọn (4 đáp án)</label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs w-6 font-medium text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
              <Input value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} placeholder={`Đáp án ${String.fromCharCode(65 + i)}`} />
              <input type="radio" name="answer" className="shrink-0" checked={answer === opt} onChange={() => setAnswer(opt)} />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Chọn radio để đánh dấu đáp án đúng</p>
        </div>
      )}

      {type === 'FILL_BLANK' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Đáp án đúng (điền vào ___)</label>
          <Input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="VD: sunny" required />
        </div>
      )}

      {type === 'MATCHING' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground block">Các cặp từ cần ghép</label>
          {pairs.map((pair, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={pair.left} onChange={e => { const n = [...pairs]; n[i].left = e.target.value; setPairs(n); }} placeholder="Từ/Cụm từ bên trái" />
              <span className="text-muted-foreground">↔</span>
              <Input value={pair.right} onChange={e => { const n = [...pairs]; n[i].right = e.target.value; setPairs(n); }} placeholder="Nghĩa/Cụm từ bên phải" />
              {i >= 2 && <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setPairs(p => p.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button>}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setPairs(p => [...p, { left: '', right: '' }])}>
            <Plus className="h-4 w-4 mr-1" />Thêm cặp
          </Button>
        </div>
      )}

      {type === 'WORD_ORDER' && (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Chủ đề / Hướng dẫn</label>
            <Input value={content} onChange={e => setContent(e.target.value)} placeholder="VD: Sắp xếp câu chào hỏi" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Câu đúng (các từ cách nhau bằng dấu cách)</label>
            <Input value={sentence} onChange={e => setSentence(e.target.value)} placeholder="VD: I go to school every day" required />
          </div>
          {sentence && <p className="text-xs text-muted-foreground">Từ ngẫu nhiên: {sentence.split(' ').filter(Boolean).sort(() => Math.random() - 0.5).join(' | ')}</p>}
        </div>
      )}

      {type === 'DICTATION' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nội dung cần nghe và viết lại</label>
          <Input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="VD: Hello, how are you?" required />
          <p className="text-xs text-muted-foreground mt-1">Học viên sẽ nghe TTS (text-to-speech) và gõ lại câu này</p>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Giải thích (tùy chọn)</label>
        <Input value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Giải thích thêm về đáp án đúng..." />
      </div>

      <Button type="submit" disabled={loading} size="sm">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        <Plus className="h-4 w-4 mr-2" />Thêm câu hỏi
      </Button>
    </form>
  );
}

export default function EditExercisePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const data = await api.get<Exercise>(`/language/exercises/${id}`);
      setExercise(data);
    } catch { router.push('/admin/language'); }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const addQuestion = async (q: Partial<Question>) => {
    await api.post(`/language/exercises/${id}/questions`, { ...q, order: exercise?.questions.length || 0 });
    await load();
  };

  const deleteQuestion = async (qid: string) => {
    setBusy(b => ({ ...b, [qid]: true }));
    try { await api.delete(`/language/questions/${qid}`); setExercise(e => e ? { ...e, questions: e.questions.filter(q => q.id !== qid) } : e); }
    catch { }
    setBusy(b => ({ ...b, [qid]: false }));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!exercise) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/language')}>
          <ChevronLeft className="h-4 w-4 mr-1" />Quay lại
        </Button>
      </div>

      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{exercise.title}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {TYPE_LABEL[exercise.type]} · {exercise.language.toUpperCase()} · {exercise.level}
            </p>
          </div>
          <Badge>{exercise.questions.length} câu hỏi</Badge>
        </div>
      </div>

      {/* Add question */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Thêm câu hỏi ({TYPE_LABEL[exercise.type]})</CardTitle></CardHeader>
        <CardContent><QuestionForm type={exercise.type} onAdd={addQuestion} /></CardContent>
      </Card>

      {/* Questions list */}
      <div>
        <h2 className="font-semibold mb-3">Danh sách câu hỏi</h2>
        {exercise.questions.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Chưa có câu hỏi nào. Thêm câu hỏi ở trên.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {exercise.questions.map((q, i) => (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6 shrink-0 mt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="font-medium text-sm">{q.content}</p>
                      {q.options && (
                        <div className="flex flex-wrap gap-2">
                          {(q.options as string[]).map((opt, oi) => (
                            <span key={oi} className={`text-xs px-2 py-1 rounded border ${opt === q.answer ? 'border-green-500 bg-green-50 text-green-700' : 'border-border bg-muted/50'}`}>
                              {opt === q.answer ? '✓ ' : ''}{opt}
                            </span>
                          ))}
                        </div>
                      )}
                      {exercise.type === 'MATCHING' && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(q.answer as Record<string, string>).map(([k, v]) => (
                            <span key={k} className="text-xs px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700">{k} ↔ {v}</span>
                          ))}
                        </div>
                      )}
                      {(exercise.type === 'FILL_BLANK' || exercise.type === 'DICTATION') && (
                        <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded">✓ {String(q.answer)}</span>
                      )}
                      {exercise.type === 'WORD_ORDER' && (
                        <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded">✓ {(q.answer as string[]).join(' ')}</span>
                      )}
                      {q.explanation && <p className="text-xs text-muted-foreground italic">💡 {q.explanation}</p>}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                      disabled={busy[q.id]} onClick={() => deleteQuestion(q.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
