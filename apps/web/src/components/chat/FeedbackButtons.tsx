'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackButtonsProps {
  messageId: string;
  subject?: string;
  mode?: string;
  provider?: string;
}

export function FeedbackButtons({ messageId, subject = 'general', mode = 'tutor', provider = '' }: FeedbackButtonsProps) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVote(vote: 'up' | 'down') {
    if (voted || loading) return;
    setLoading(true);
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageId, subject, mode, vote, provider }),
      });
      setVoted(vote);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1 px-1">
      <button
        onClick={() => handleVote('up')}
        disabled={!!voted || loading}
        title="Phản hồi hữu ích"
        className={cn(
          'p-1 rounded transition-colors',
          voted === 'up'
            ? 'text-green-500'
            : 'text-gray-400 hover:text-green-500 disabled:opacity-40',
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => handleVote('down')}
        disabled={!!voted || loading}
        title="Phản hồi chưa hữu ích"
        className={cn(
          'p-1 rounded transition-colors',
          voted === 'down'
            ? 'text-red-500'
            : 'text-gray-400 hover:text-red-500 disabled:opacity-40',
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
