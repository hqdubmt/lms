// Phase 2 — Feature Flags
// UI cũ vẫn còn code. Chỉ ẩn khỏi menu khi flag = false.
// Phase 6: FEATURE_NEW_DASHBOARD — bật khi dashboard-v2 ổn định.

export const FEATURES = {
  LEGACY_AI_PANELS:     false,
  LEGACY_KNOWLEDGE_MAP: false,
  LEGACY_AI_TEACHER:    false,
  LEGACY_AI_MENTOR:     false,
  LEGACY_CAREER_ADVISOR: false,
  FEATURE_NEW_DASHBOARD: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
