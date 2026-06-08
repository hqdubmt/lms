'use client';

import { useState } from 'react';
import {
  Cpu, Users, BookOpen, Zap, Clock,
  Languages, ChevronDown, ChevronUp, AlertTriangle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Source } from './types';

const LANG_INTENT_SHORT: Record<string, string> = {
  LANGUAGE_TRANSLATE:  'Dịch',
  LANGUAGE_GRAMMAR:    'Ngữ pháp',
  LANGUAGE_VOCABULARY: 'Từ vựng',
  LANGUAGE_SPEAKING:   'Phát âm',
  LANGUAGE_WRITING:    'Viết',
  LANGUAGE_LISTENING:  'Nghe',
};

const PROVIDER_COLOR: Record<string, string> = {
  groq:   'bg-orange-50 text-orange-700 border-orange-200',
  gemini: 'bg-blue-50 text-blue-700 border-blue-200',
  ollama: 'bg-purple-50 text-purple-700 border-purple-200',
};

const AGENT_ICONS: Record<string, string> = {
  tutor:           '🧑‍🏫',
  math:            '📐',
  language:        '🌐',
  quiz:            '📝',
  homework:        '📚',
  research:        '🔍',
  review:          '✅',
  knowledge_graph: '🕸️',
  learning_coach:  '🎯',
  reflection:      '🪞',
  self_correction: '🔧',
  critic:          '⚖️',
  planner:         '🗺️',
};

function providerKey(label?: string) {
  if (!label) return 'groq';
  if (label.toLowerCase().includes('gemini')) return 'gemini';
  if (label.toLowerCase().includes('ollama')) return 'ollama';
  return 'groq';
}

interface Props {
  provider?: string;
  activeAgents?: string[];
  sources?: Source[];
  langIntent?: string | null;
  validationWarnings?: string[] | null;
  latencyMs?: number;
  timestamp?: number;
  isStreaming?: boolean;
}

export function StreamActivityStrip({
  provider, activeAgents, sources, langIntent,
  validationWarnings, latencyMs, timestamp, isStreaming,
}: Props) {
  const [showSources, setShowSources] = useState(false);
  const [showAgents, setShowAgents] = useState(false);

  const hasAgents   = (activeAgents?.length ?? 0) > 0;
  const hasSources  = (sources?.length ?? 0) > 0;
  const hasIntent   = !!langIntent;
  const hasWarning  = (validationWarnings?.length ?? 0) > 0;
  const hasLatency  = latencyMs !== undefined && latencyMs > 0;
  const hasProvider = !!provider;

  if (!hasProvider && !hasAgents && !hasSources && !hasLatency && !hasIntent) return null;

  const pKey = providerKey(provider);
  const providerShort = provider?.split('·')[0]?.trim() ?? 'AI';

  return (
    <div className="mt-1 space-y-1">
      {/* Main activity strip */}
      <div className="flex flex-wrap items-center gap-1 px-1">

        {/* Provider badge */}
        {hasProvider && (
          <span className={cn(
            'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border',
            PROVIDER_COLOR[pKey],
          )}>
            {isStreaming
              ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
              : <Cpu className="h-2.5 w-2.5" />}
            {providerShort}
          </span>
        )}

        {/* Agent badges — collapsible when many */}
        {hasAgents && activeAgents!.length <= 2 ? (
          activeAgents!.map(agent => (
            <span key={agent}
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200',
                isStreaming && 'animate-pulse',
              )}>
              <span>{AGENT_ICONS[agent.toLowerCase()] ?? '🤖'}</span>
              {agent}
            </span>
          ))
        ) : hasAgents ? (
          <>
            <button
              onClick={() => setShowAgents(v => !v)}
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-colors',
                isStreaming && 'animate-pulse',
              )}>
              <Users className="h-2.5 w-2.5" />
              {activeAgents!.length} agents
              {showAgents ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            </button>
            {showAgents && (
              <div className="w-full ml-1 flex flex-wrap gap-1 mt-0.5">
                {activeAgents!.map(agent => (
                  <span key={agent}
                    className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">
                    <span>{AGENT_ICONS[agent.toLowerCase()] ?? '🤖'}</span>{agent}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : null}

        {/* RAG sources badge — clickable */}
        {hasSources && (
          <button
            onClick={() => setShowSources(v => !v)}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 transition-colors"
          >
            <BookOpen className="h-2.5 w-2.5" />
            {sources!.length} nguồn RAG
            {showSources ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </button>
        )}

        {/* Language intent badge */}
        {hasIntent && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">
            <Languages className="h-2.5 w-2.5" />
            {LANG_INTENT_SHORT[langIntent!] ?? langIntent}
          </span>
        )}

        {/* Latency */}
        {hasLatency && (
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
            <Zap className="h-2.5 w-2.5 text-yellow-400" />
            {(latencyMs! / 1000).toFixed(1)}s
          </span>
        )}

        {/* Timestamp */}
        {timestamp && (
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="h-2.5 w-2.5" />
            {new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}

        {/* Validation warning inline */}
        {hasWarning && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
            <AlertTriangle className="h-2.5 w-2.5" />
            {validationWarnings!.includes('NO_STEPS')
              ? 'Thiếu bước giải'
              : validationWarnings!.includes('ANSWER_MISSING')
                ? 'Thiếu điểm chấm'
                : 'Phản hồi ngắn'}
          </span>
        )}
      </div>

      {/* RAG sources expanded */}
      {showSources && hasSources && (
        <div className="ml-1 flex flex-wrap gap-1">
          {sources!.map((s, i) => (
            <span key={i} className="text-[10px] bg-teal-50 border border-teal-100 text-teal-700 rounded-full px-2 py-0.5">
              {s.lesson}{s.topic ? ` · ${s.topic}` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
