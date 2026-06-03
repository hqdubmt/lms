/**
 * Knowledge Validation — Feature 6 (chaiainc.md)
 * Kiểm tra AI response: empty, missing steps, math consistency.
 * CHỈ CẢNH BÁO — không chặn response.
 */

export type ValidationWarning =
  | 'EMPTY_RESPONSE'
  | 'NO_STEPS'
  | 'NO_MATH_FORMULA'
  | 'ANSWER_MISSING'
  | 'TOO_SHORT';

export interface ValidationResult {
  ok: boolean;
  warnings: ValidationWarning[];
}

const MIN_RESPONSE_LENGTH = 30;

export function validateResponse(response: string, subject: string, mode: string): ValidationResult {
  const warnings: ValidationWarning[] = [];
  const text = response.trim();

  if (!text) {
    warnings.push('EMPTY_RESPONSE');
    return { ok: false, warnings };
  }

  if (text.length < MIN_RESPONSE_LENGTH) {
    warnings.push('TOO_SHORT');
  }

  // Math: check for step-by-step
  if (subject === 'math' && mode !== 'quiz') {
    const hasFormula = /\$.*?\$|\\\[|\\\(|=|\+|-|\*|\//.test(text);
    if (!hasFormula && text.length > 100) {
      warnings.push('NO_MATH_FORMULA');
    }

    const hasSteps = /bước|step|thứ nhất|thứ hai|đầu tiên|tiếp theo|1\.|2\.|→/i.test(text);
    if (!hasSteps && text.length > 200) {
      warnings.push('NO_STEPS');
    }
  }

  // Homework: check for score
  if (mode === 'homework') {
    const hasScore = /điểm.*\d|score.*\d|\d+\/10|\d+\/100/i.test(text);
    if (!hasScore) {
      warnings.push('ANSWER_MISSING');
    }
  }

  return { ok: warnings.length === 0, warnings };
}
