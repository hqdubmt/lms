#!/usr/bin/env bash
# V1 Release - E2E Flow Tests
# Usage: ./test-flows.sh [base_url]
# Default base URL: http://localhost:4000

BASE="${1:-http://localhost:4000}"
PASS=0
FAIL=0

green() { echo -e "\033[32m✓ $1\033[0m"; }
red()   { echo -e "\033[31m✗ $1\033[0m"; }
header(){ echo -e "\n\033[1;34m=== $1 ===\033[0m"; }

check() {
  local label="$1"
  local status="$2"
  local expected="${3:-200}"
  if [ "$status" = "$expected" ] || [ "$status" = "201" -a "$expected" = "200" ]; then
    green "$label (HTTP $status)"
    PASS=$((PASS+1))
  else
    red "$label (HTTP $status, expected ~$expected)"
    FAIL=$((FAIL+1))
  fi
}

# ─── Seed data ────────────────────────────────────────────────────────────────
STUDENT_EMAIL="test_student_$$@test.local"
INSTRUCTOR_EMAIL="test_instructor_$$@test.local"
ADMIN_EMAIL="test_admin_$$@test.local"
PASSWORD="TestPass123!"

# ─── STUDENT FLOW ─────────────────────────────────────────────────────────────
header "STUDENT FLOW"

# Register
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Student\",\"email\":\"$STUDENT_EMAIL\",\"password\":\"$PASSWORD\"}")
check "Register student" "$STATUS" "201"

# Login
RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$STUDENT_EMAIL\",\"password\":\"$PASSWORD\"}")
STUDENT_TOKEN=$(echo "$RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
STATUS=$(echo "$RESP" | grep -o '"accessToken"' | wc -l | tr -d ' ')
[ "$STATUS" = "1" ] && check "Login student" "200" || check "Login student" "0"

# List courses
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/courses" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
check "List courses" "$STATUS"

# Dashboard / profile
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/users/me" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
check "Get profile (me)" "$STATUS"

# XP / progress
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/ai/progress" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
check "Progress (XP/Level/Streak)" "$STATUS"

# Language vocab sets
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/language/vocab-sets" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
check "Language vocab sets" "$STATUS"

# Math topics
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/math/topics" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
check "Math topics" "$STATUS"

# Viet sets
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/viet/sets" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
check "Viet sets" "$STATUS"

# Quiz list
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/quiz" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
check "Quiz list" "$STATUS"

# Notifications
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/notifications" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
check "Notifications" "$STATUS"

# Refresh token
REFRESH_TOKEN=$(echo "$RESP" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
if [ -n "$REFRESH_TOKEN" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
  check "Refresh token" "$STATUS"
fi

# ─── INSTRUCTOR FLOW ──────────────────────────────────────────────────────────
header "INSTRUCTOR FLOW"

# Register instructor
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Instructor\",\"email\":\"$INSTRUCTOR_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"INSTRUCTOR\"}")
check "Register instructor" "$STATUS" "201"

RESP2=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$INSTRUCTOR_EMAIL\",\"password\":\"$PASSWORD\"}")
INSTR_TOKEN=$(echo "$RESP2" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
STATUS=$(echo "$RESP2" | grep -o '"accessToken"' | wc -l | tr -d ' ')
[ "$STATUS" = "1" ] && check "Login instructor" "200" || check "Login instructor" "0"

# Create course
RESP3=$(curl -s -X POST "$BASE/courses" \
  -H "Authorization: Bearer $INSTR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Course V1\",\"description\":\"Auto test\",\"subject\":\"LANGUAGE\",\"level\":\"BEGINNER\"}")
COURSE_ID=$(echo "$RESP3" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
STATUS=$(echo "$RESP3" | grep -o '"id"' | wc -l | tr -d ' ')
[ "$STATUS" -ge "1" ] 2>/dev/null && check "Create course" "201" || check "Create course" "0"

# List courses as instructor
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/courses?instructor=me" \
  -H "Authorization: Bearer $INSTR_TOKEN")
check "Instructor course list" "$STATUS"

# Announcements
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/announcements" \
  -H "Authorization: Bearer $INSTR_TOKEN")
check "Announcements" "$STATUS"

# Analytics
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/ai/analytics/overview" \
  -H "Authorization: Bearer $INSTR_TOKEN")
check "Analytics overview" "$STATUS"

# ─── ADMIN FLOW ───────────────────────────────────────────────────────────────
header "ADMIN FLOW"

# Site settings (public)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/site-settings")
check "Site settings (public)" "$STATUS"

# Users list (admin-only, expect 401/403 with student token)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/users" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
check "Users list blocked for student" "$STATUS" "403"

# Forum
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/forum/posts" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
check "Forum posts" "$STATUS"

# ─── SUMMARY ──────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────"
echo -e "\033[32mPASS: $PASS\033[0m  \033[31mFAIL: $FAIL\033[0m"
TOTAL=$((PASS+FAIL))
if [ "$FAIL" = "0" ]; then
  echo -e "\033[1;32m✓ ALL $TOTAL CHECKS PASSED — LMS V1 READY FOR RELEASE\033[0m"
else
  echo -e "\033[1;31m✗ $FAIL/$TOTAL CHECKS FAILED\033[0m"
  exit 1
fi
