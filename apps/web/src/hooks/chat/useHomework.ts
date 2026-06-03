'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { recordLearningEvent } from '@/services/analytics';
import type { HomeworkResult } from '@/components/chat/HomeworkRubricCard';
import type { Subject } from '@/components/chat/types';

interface Options {
  subject: Subject;
}

export function useHomework({ subject }: Options) {
  const [homeworkResult, setHomeworkResult] = useState<HomeworkResult | null>(null);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homeworkError, setHomeworkError] = useState<string | null>(null);

  const submitHomework = useCallback(async (content: string, topic?: string) => {
    if (!content.trim()) return;
    setHomeworkLoading(true);
    setHomeworkError(null);
    setHomeworkResult(null);

    try {
      const result = await api.post<HomeworkResult>('/ai/homework', { content, subject, topic });
      setHomeworkResult(result);
      recordLearningEvent({
        type: 'homework_submitted',
        subject,
        score: result.score !== null ? result.score * 10 : undefined,
        topic,
      });
    } catch {
      setHomeworkError('Không thể chấm bài. Vui lòng thử lại.');
    } finally {
      setHomeworkLoading(false);
    }
  }, [subject]);

  const clearHomeworkResult = useCallback(() => {
    setHomeworkResult(null);
    setHomeworkError(null);
  }, []);

  return { homeworkResult, homeworkLoading, homeworkError, submitHomework, clearHomeworkResult };
}
