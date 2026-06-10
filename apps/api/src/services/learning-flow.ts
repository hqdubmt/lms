// Phase 3 — LearningFlowService
// Layer mới điều phối luồng học. Không sửa lesson cũ.
// Luồng: Lesson → Exercise → AI Explain → Game → Progress

export type FlowStep = 'lesson' | 'exercise' | 'ai_explain' | 'game' | 'progress';

export interface FlowContext {
  userId:   string;
  subject:  'math' | 'language' | 'viet' | 'general';
  lessonId: string;
  mastery:  number;   // 0.0 – 1.0
  mistakeCount: number;
}

export interface FlowDecision {
  nextStep:   FlowStep;
  reason:     string;
  gameHref?:  string;  // nếu nextStep = 'game'
}

const GAME_MAP: Record<string, string> = {
  math:     '/math/game/speed-math',
  language: '/language/game/vocab-hunter',
  viet:     '/viet/game/chinh-ta',
  general:  '/game',
};

export function decideLearningFlow(ctx: FlowContext, currentStep: FlowStep): FlowDecision {
  switch (currentStep) {
    case 'lesson':
      return { nextStep: 'exercise', reason: 'Hoàn thành bài học → làm bài tập' };

    case 'exercise':
      if (ctx.mistakeCount > 0) {
        return { nextStep: 'ai_explain', reason: 'Có lỗi sai → AI giải thích' };
      }
      return { nextStep: 'game', reason: 'Không có lỗi → chuyển sang game luyện tập', gameHref: GAME_MAP[ctx.subject] ?? GAME_MAP.general };

    case 'ai_explain':
      return {
        nextStep: 'game',
        reason: 'Sau AI giải thích → luyện tập qua game',
        gameHref: GAME_MAP[ctx.subject] ?? GAME_MAP.general,
      };

    case 'game':
      return { nextStep: 'progress', reason: 'Xong game → cập nhật tiến độ' };

    case 'progress':
      if (ctx.mastery >= 0.8) {
        return { nextStep: 'lesson', reason: 'Thành thạo → chuyển bài học tiếp theo' };
      }
      return { nextStep: 'exercise', reason: 'Chưa thành thạo → ôn tập thêm bài tập' };
  }
}

export function getFlowSteps(): FlowStep[] {
  return ['lesson', 'exercise', 'ai_explain', 'game', 'progress'];
}

export function getStepLabel(step: FlowStep): string {
  const labels: Record<FlowStep, string> = {
    lesson:     'Bài học',
    exercise:   'Bài tập',
    ai_explain: 'AI giải thích',
    game:       'Game luyện tập',
    progress:   'Tiến độ',
  };
  return labels[step];
}
