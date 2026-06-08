'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, Trophy, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';

import { SUBJECT_META } from '@/components/chat/constants';
import { detectSubject } from '@/services/chat/subjectUtils';
import { useAiHealth } from '@/hooks/chat/useAiHealth';
import { useChatHistory } from '@/hooks/chat/useChatHistory';
import { useChatStream } from '@/hooks/chat/useChatStream';
import { useMic } from '@/hooks/chat/useMic';

import { ChatHeader } from '@/components/chat/ChatHeader';
import { ModeSelector } from '@/components/chat/ModeSelector';
import { BrainPanel } from '@/components/chat/BrainPanel';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { VoicePanel } from '@/components/chat/VoicePanel';
import { LangQuickBar } from '@/components/chat/LangQuickBar';
import { HomeworkPanel } from '@/components/chat/HomeworkPanel';
import { AdaptivePanel } from '@/components/chat/AdaptivePanel';
import { StudyPlanPanel } from '@/components/chat/StudyPlanPanel';
import { useHomework } from '@/hooks/chat/useHomework';
import { getAchievements, getXPData } from '@/services/gamification';

import type { Message, Mode, Subject } from '@/components/chat/types';

interface ToastAchievement { id: string; label: string; description: string }

export function AiChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showBrain, setShowBrain] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [mode, setMode] = useState<Mode>('tutor');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [subjectOverride, setSubjectOverride] = useState<Subject | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voiceMode = mode === 'voice';
  const [toastAch, setToastAch] = useState<ToastAchievement | null>(null);
  const prevAchIdsRef = useRef<Set<string>>(new Set());
  const [toastLevelUp, setToastLevelUp] = useState<{ level: number; rank: string } | null>(null);
  const prevLevelRef = useRef<number | null>(null);

  const baseSubject = detectSubject(pathname);
  const subject: Subject = subjectOverride ?? baseSubject;
  const meta = SUBJECT_META[subject];
  const ttsLang = subject === 'language' ? 'en-US' : 'vi-VN';

  const { aiOk, aiLabel } = useAiHealth();

  const { historyLoading, clearHistory } = useChatHistory({
    open, minimized, subject, messages, setMessages,
  });

  const { streaming, sendMessage, handleStop, brainKey, streamChars } = useChatStream({
    messages,
    setMessages: setMessages as React.Dispatch<React.SetStateAction<Message[]>>,
    subject,
    mode,
    setMode,
    aiLabel,
  });

  const { micListening, micAvailable, handleMic } = useMic({
    subject,
    onResult: t => setInput(prev => prev ? `${prev} ${t}` : t),
  });

  const { homeworkResult, homeworkLoading, homeworkError, submitHomework, clearHomeworkResult } =
    useHomework({ subject });

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus();
  }, [open, minimized]);

  // Check for newly unlocked achievements after each message
  useEffect(() => {
    if (brainKey === 0) return;
    const timer = setTimeout(async () => {
      try {
        const achs = await getAchievements();
        const unlocked = achs.filter(a => a.unlockedAt !== null);
        const newOne = unlocked.find(a => !prevAchIdsRef.current.has(a.id));
        if (newOne) {
          setToastAch({ id: newOne.id, label: newOne.label, description: newOne.description });
          setTimeout(() => setToastAch(null), 4000);
        }
        prevAchIdsRef.current = new Set(unlocked.map(a => a.id));
      } catch { /* noop */ }
    }, 1800);
    return () => clearTimeout(timer);
  }, [brainKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for XP level-up after each message
  useEffect(() => {
    if (brainKey === 0) return;
    const timer = setTimeout(async () => {
      try {
        const xp = await getXPData();
        if (!xp) return;
        if (prevLevelRef.current !== null && xp.level > prevLevelRef.current) {
          setToastLevelUp({ level: xp.level, rank: xp.rank });
          setTimeout(() => setToastLevelUp(null), 5000);
        }
        prevLevelRef.current = xp.level;
      } catch { /* noop */ }
    }, 2200);
    return () => clearTimeout(timer);
  }, [brainKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = useCallback(() => {
    // Remove the last AI error message, find the last user message, re-send with correct history
    const sliced = messages.slice(0, -1);
    const lastUser = [...sliced].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    const lastUserIdx = sliced.lastIndexOf(lastUser);
    sendMessage(lastUser.content, sliced.slice(0, lastUserIdx));
  }, [messages, sendMessage]);

  // ─── Level-Up Toast ──────────────────────────────────────────────────────────
  const levelUpToast = toastLevelUp ? (
    <div className="fixed bottom-[700px] right-4 lg:bottom-[640px] lg:right-6 z-50 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 shadow-lg max-w-[280px]">
        <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <Star className="h-5 w-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-violet-800">Lên cấp độ mới!</p>
          <p className="text-xs font-semibold text-violet-700">Level {toastLevelUp.level}</p>
          <p className="text-[10px] text-violet-600 truncate">{toastLevelUp.rank}</p>
        </div>
        <button onClick={() => setToastLevelUp(null)} className="text-violet-400 hover:text-violet-600 shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  ) : null;

  // ─── Achievement Toast ───────────────────────────────────────────────────────
  const achievementToast = toastAch ? (
    <div className="fixed bottom-[640px] right-4 lg:bottom-[580px] lg:right-6 z-50 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 shadow-lg max-w-[280px]">
        <div className="h-9 w-9 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
          <Trophy className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-yellow-800">Thành tích mới!</p>
          <p className="text-xs font-semibold text-yellow-700 truncate">{toastAch.label}</p>
          <p className="text-[10px] text-yellow-600 truncate">{toastAch.description}</p>
        </div>
        <button onClick={() => setToastAch(null)} className="text-yellow-400 hover:text-yellow-600 shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  ) : null;

  // ─── Collapsed FAB ──────────────────────────────────────────────────────────
  if (!open) {
    return (
      <>
        {levelUpToast}
        {achievementToast}
        <button
          onClick={() => setOpen(true)}
          title="AI Trợ lý học tập"
          className={cn(
            'fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50',
            'h-14 w-14 rounded-2xl shadow-lg flex items-center justify-center',
            'bg-gradient-to-br', meta.color,
            'hover:scale-105 active:scale-95 transition-all duration-200',
            aiOk === false && 'opacity-60',
          )}
        >
          <Bot className="h-6 w-6 text-white" />
          {aiOk && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
          )}
        </button>
      </>
    );
  }

  // ─── Chat Window ────────────────────────────────────────────────────────────
  return (
    <>
    {levelUpToast}
    {achievementToast}
    <div className={cn(
      'fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50',
      'flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100',
      'w-[360px] sm:w-[400px] transition-all duration-200',
      minimized ? 'h-[52px]' : 'h-[560px]',
    )}>
      <ChatHeader
        label={meta.label}
        color={meta.color}
        minimized={minimized}
        showBrain={showBrain}
        showPlanner={showPlanner}
        aiOk={aiOk}
        aiLabel={aiLabel}
        streaming={streaming}
        onToggleMinimize={() => setMinimized(m => !m)}
        onToggleBrain={e => { e.stopPropagation(); setShowBrain(b => !b); setShowPlanner(false); }}
        onTogglePlanner={e => { e.stopPropagation(); setShowPlanner(p => !p); setShowBrain(false); }}
        onClose={e => { e.stopPropagation(); setOpen(false); handleStop(); }}
      />

      {!minimized && (
        <>
          {showBrain && (
            <div className="border-b border-gray-100 bg-gray-50 shrink-0 max-h-48 overflow-y-auto">
              <BrainPanel
                key={brainKey}
                subject={subject}
                onSendMessage={text => { setShowBrain(false); sendMessage(text); }}
              />
            </div>
          )}

          {showPlanner && (
            <div className="shrink-0 max-h-44 overflow-y-auto">
              <StudyPlanPanel
                subject={subject}
                onSendMessage={text => { setShowPlanner(false); sendMessage(text); }}
              />
            </div>
          )}

          <ModeSelector mode={mode} onModeChange={setMode} />

          {voiceMode ? (
            <VoicePanel
              subject={subject}
              color={meta.color}
              messages={messages}
              streaming={streaming}
              onTranscript={(text) => { sendMessage(text); }}
            />
          ) : (
            <>
              <MessageList
                messages={messages}
                streaming={streaming}
                subject={subject}
                mode={mode}
                avatarColor={meta.color}
                ttsLang={ttsLang}
                historyLoading={historyLoading}
                label={meta.label}
                color={meta.color}
                bottomRef={bottomRef}
                onSendMessage={sendMessage}
                onSetInput={setInput}
                onRetry={handleRetry}
              />

              {/* Language Tutor quick actions — persistent bar */}
              {subject === 'language' && messages.length > 0 && (
                <LangQuickBar onSetInput={setInput} />
              )}

              {/* Adaptive Learning — show panel when mode is adaptive */}
              {mode === 'adaptive' && (
                <AdaptivePanel
                  subject={subject}
                  onSendMessage={text => sendMessage(text)}
                />
              )}

              {/* Homework 2.0+ — rubric panel */}
              {mode === 'homework' && (
                <HomeworkPanel
                  color={meta.color}
                  loading={homeworkLoading}
                  result={homeworkResult}
                  error={homeworkError}
                  onSubmit={submitHomework}
                  onClear={clearHomeworkResult}
                />
              )}

              {/* Live stream counter */}
              {streaming && streamChars > 0 && (
                <div className="px-3 pb-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                  <span className="text-[10px] text-muted-foreground">
                    {streamChars} ký tự · đang nhận...
                  </span>
                </div>
              )}

              <ChatInput
                input={input}
                mode={mode}
                streaming={streaming}
                aiOk={aiOk}
                micListening={micListening}
                micAvailable={micAvailable}
                color={meta.color}
                hasMessages={messages.length > 0}
                inputRef={inputRef}
                subjectOverride={subjectOverride}
                onInputChange={setInput}
                onSend={() => { sendMessage(input); setInput(''); }}
                onStop={handleStop}
                onMic={handleMic}
                onClearHistory={clearHistory}
                onSubjectOverride={setSubjectOverride}
              />
            </>
          )}
        </>
      )}
    </div>
    </>
  );
}
