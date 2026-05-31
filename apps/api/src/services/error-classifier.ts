/**
 * Error Classifier — testtoatiengviet.md Bước 3
 *
 * Phân loại lỗi parser/validator thành 5 nhóm chính:
 *   - ocr_artifact       — lỗi OCR (mất dấu, ký tự lạ)
 *   - lesson_split_fail  — lỗi lesson split (không tách được bài)
 *   - missing_definition — lỗi thiếu definition
 *   - missing_hints      — lỗi thiếu hints
 *   - json_invalid       — lỗi JSON (parse/repair thất bại)
 *
 * Thêm các loại phụ:
 *   - missing_example    — thiếu example
 *   - quality_gate_fail  — quality score < ngưỡng
 *   - hallucination      — AI bịa đặt nội dung
 *   - empty_content      — nội dung trống / quá ngắn
 */

export type ErrorType =
  | 'ocr_artifact'
  | 'lesson_split_fail'
  | 'missing_definition'
  | 'missing_hints'
  | 'missing_example'
  | 'json_invalid'
  | 'quality_gate_fail'
  | 'hallucination'
  | 'empty_content';

export const ERROR_LABELS: Record<ErrorType, string> = {
  ocr_artifact: 'Lỗi OCR (mất dấu, ký tự lạ)',
  lesson_split_fail: 'Lỗi lesson split (không tách được bài)',
  missing_definition: 'Lỗi thiếu definition',
  missing_hints: 'Lỗi thiếu hints',
  missing_example: 'Lỗi thiếu example',
  json_invalid: 'Lỗi JSON (parse/repair thất bại)',
  quality_gate_fail: 'Lỗi quality gate (điểm quá thấp)',
  hallucination: 'Lỗi AI bịa đặt (hallucination)',
  empty_content: 'Lỗi nội dung trống / quá ngắn',
};

// ─── Parser-stage classifiers (không cần AI) ─────────────────────────────────

export function detectOcrArtifacts(text: string): boolean {
  if (!text || text.length < 20) return false;
  const sample = text.slice(0, 2000);

  // Kiểm tra tỉ lệ ký tự tiếng Việt có dấu
  const vietCharCount = (sample.match(/[àáảãạăắặẳẵằâấậẩẫầèéẻẽẹêếệểễềìíỉĩịòóỏõọôốộổỗồơớợởỡờùúủũụưứựửữừỳýỷỹỵđÀÁẢÃẠĂẮẶẲẴẰÂẤẬẨẪẦÈÉẺẼẸÊẾỆỂỄỀÌÍỈĨỊÒÓỎÕỌÔỐỘỔỖỒƠỚỢỞỠỜÙÚỦŨỤƯỨỰỬỮỪỲÝỶỸỴĐ]/g) ?? []).length;
  const wordCount = sample.split(/\s+/).filter(Boolean).length;
  if (wordCount > 20 && vietCharCount / wordCount < 0.3) return true;

  // Ký tự lạ: nhiều ký hiệu ASCII không phải chữ cái và dấu câu chuẩn
  const weirdCharRatio = (sample.match(/[^\w\sàáảãạăắặẳẵằâấậẩẫầèéẻẽẹêếệểễềìíỉĩịòóỏõọôốộổỗồơớợởỡờùúủũụưứựửữừỳýỷỹỵđÀÁẢÃẠĂẮẶẲẴẰÂẤẬẨẪẦÈÉẺẼẸÊẾỆỂỄỀÌÍỈĨỊÒÓỎÕỌÔỐỘỔỖỒƠỚỢỞỠỜÙÚỦŨỤƯỨỰỬỮỪỲÝỶỸỴĐ.,;:!?'"()\-–—\/\n]/g) ?? []).length / sample.length;
  if (weirdCharRatio > 0.08) return true;

  // Chuỗi ký tự lạ liên tiếp (OCR garbage)
  if (/[^\w\s]{5,}/.test(sample)) return true;

  // Nhiều chữ HOA liên tiếp bất thường (OCR noise)
  const capsRuns = sample.match(/[A-Z]{6,}/g) ?? [];
  if (capsRuns.length > 3) return true;

  return false;
}

export function detectLessonSplitFail(richChunkCount: number, totalChunkCount: number): boolean {
  return richChunkCount === 0 || (totalChunkCount > 0 && richChunkCount === 0);
}

export function detectEmptyContent(text: string): boolean {
  if (!text || text.trim().length < 80) return true;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return wordCount < 15;
}

// ─── Validation-stage classifiers (từ validation errors array) ───────────────

export function classifyValidationErrors(validationErrors: string[]): ErrorType[] {
  const types = new Set<ErrorType>();
  for (const err of validationErrors) {
    const lower = err.toLowerCase();
    if (lower.includes('definition')) types.add('missing_definition');
    if (lower.includes('hints')) types.add('missing_hints');
    if (lower.includes('example')) types.add('missing_example');
    if (lower.includes('json') || lower.includes('parse') || lower.includes('repair')) types.add('json_invalid');
  }
  return [...types];
}

// ─── Full error classification for one test item ──────────────────────────────

export interface ItemErrorReport {
  errors: ErrorType[];
  errorLabels: string[];
  errorCount: number;
}

export function classifyItemErrors(opts: {
  text: string;
  richChunkCount: number;
  totalChunkCount: number;
  jsonRepairFailed?: boolean;
  validationErrors?: string[];
  qualityScore?: number;
  qualityGate?: number;
  hallucinationCount?: number;
}): ItemErrorReport {
  const errors = new Set<ErrorType>();

  if (detectEmptyContent(opts.text)) errors.add('empty_content');
  if (detectOcrArtifacts(opts.text)) errors.add('ocr_artifact');
  if (detectLessonSplitFail(opts.richChunkCount, opts.totalChunkCount)) errors.add('lesson_split_fail');

  if (opts.jsonRepairFailed) errors.add('json_invalid');
  if (opts.validationErrors?.length) {
    for (const t of classifyValidationErrors(opts.validationErrors)) errors.add(t);
  }

  if (
    opts.qualityScore != null &&
    opts.qualityGate != null &&
    opts.qualityScore < opts.qualityGate
  ) errors.add('quality_gate_fail');

  if (opts.hallucinationCount != null && opts.hallucinationCount > 0) errors.add('hallucination');

  const errorList = [...errors] as ErrorType[];
  return {
    errors: errorList,
    errorLabels: errorList.map((e) => ERROR_LABELS[e]),
    errorCount: errorList.length,
  };
}

// ─── Aggregate error table from a batch of reports ───────────────────────────

export interface ErrorTableRow {
  errorType: ErrorType;
  label: string;
  count: number;
  percentage: number;
  severity: 'high' | 'medium' | 'low';
}

const ERROR_SEVERITY: Record<ErrorType, 'high' | 'medium' | 'low'> = {
  lesson_split_fail: 'high',
  json_invalid: 'high',
  missing_definition: 'high',
  ocr_artifact: 'high',
  missing_hints: 'medium',
  missing_example: 'medium',
  quality_gate_fail: 'medium',
  hallucination: 'medium',
  empty_content: 'low',
};

export function buildErrorTable(
  reports: Array<{ errors: ErrorType[] }>,
  total: number,
): ErrorTableRow[] {
  const counts: Partial<Record<ErrorType, number>> = {};
  for (const r of reports) {
    for (const e of r.errors) {
      counts[e] = (counts[e] ?? 0) + 1;
    }
  }

  return (Object.entries(counts) as [ErrorType, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([errorType, count]) => ({
      errorType,
      label: ERROR_LABELS[errorType],
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      severity: ERROR_SEVERITY[errorType],
    }));
}

// ─── Aggregate 3 chỉ số chính (testtoatiengviet.md Bước 2) ──────────────────

export interface BatchTestSummary {
  total: number;
  parserSuccessCount: number;
  parserSuccessPct: number;
  jsonValidCount: number;
  jsonValidPct: number;
  qualityPassCount: number;
  qualityPassPct: number;
  errorTable: ErrorTableRow[];
  topError: string | null;
  recommendation: string | null;
}

export function buildBatchSummary(opts: {
  total: number;
  parserSuccessCount: number;
  jsonValidCount: number;
  qualityPassCount: number;
  errorReports: Array<{ errors: ErrorType[] }>;
}): BatchTestSummary {
  const errorTable = buildErrorTable(opts.errorReports, opts.total);
  const topError = errorTable[0] ?? null;

  // Recommendation theo testtoatiengviet.md Bước 4
  let recommendation: string | null = null;
  if (topError) {
    const pct = topError.percentage;
    const label = topError.label;
    if (pct >= 30) {
      recommendation = `⚠ ${pct}% lỗi "${label}" → Ưu tiên sửa ngay trước khi làm tính năng mới`;
    } else if (pct >= 15) {
      recommendation = `ℹ ${pct}% lỗi "${label}" → Nên sửa trong sprint tiếp theo`;
    } else {
      recommendation = `✓ Lỗi phân tán, không có loại lỗi nào chiếm quá 15% — hệ thống khá ổn định`;
    }
  }

  const t = opts.total;
  return {
    total: t,
    parserSuccessCount: opts.parserSuccessCount,
    parserSuccessPct: t > 0 ? Math.round((opts.parserSuccessCount / t) * 100) : 0,
    jsonValidCount: opts.jsonValidCount,
    jsonValidPct: t > 0 ? Math.round((opts.jsonValidCount / t) * 100) : 0,
    qualityPassCount: opts.qualityPassCount,
    qualityPassPct: t > 0 ? Math.round((opts.qualityPassCount / t) * 100) : 0,
    errorTable,
    topError: topError?.label ?? null,
    recommendation,
  };
}
