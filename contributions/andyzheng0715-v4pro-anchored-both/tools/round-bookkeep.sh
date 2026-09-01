#!/usr/bin/env bash
# 用法: ./round-bookkeep.sh <run> <variant> <task> <dir> <done>
# 找会话(按 mtime 从新到旧,内容含 <dir> 且 agentPreset=<variant>)→ 分析 → 追加 CSV → 重置夹具。
set -euo pipefail
if [ "$#" -lt 5 ]; then
  echo "usage: $0 <run> <variant> <task> <dir> <done>" >&2
  exit 1
fi
RUN=$1; VAR=$2; TASK=$3; DIR=$4; DONE=$5

# 可配置根目录(默认 $HOME/dsh,避免硬编码 /home/andy/...);可用 DSH_BASE_DIR 覆盖。
BASE_DIR=${DSH_BASE_DIR:-"$HOME/dsh"}
ANALYZE_DIR="$BASE_DIR/research/analyze"
RESULTS_CSV="$BASE_DIR/research/results.csv"
FIXTURE_ROOT="$(realpath -m -- "$BASE_DIR/test-fixtures" 2>/dev/null || printf '%s' "$BASE_DIR/test-fixtures")"

# 校验 $DIR:必须解析成夹具根目录内的绝对路径;不允许 .、..、/ 自身、
# 绝对路径或根外路径(防止 rm -rf 越界)。
case "$DIR" in
  ""|"."|".."|"/") echo "error: DIR must be a relative subdirectory inside the fixture root" >&2; exit 1 ;;
  /*) echo "error: DIR must be relative, got absolute path: $DIR" >&2; exit 1 ;;
esac
FIXTURE_DIR="$(realpath -m -- "$FIXTURE_ROOT/$DIR" 2>/dev/null)" || {
  echo "error: cannot resolve DIR under the fixture root: $DIR" >&2
  exit 1
}
case "$FIXTURE_DIR" in
  "$FIXTURE_ROOT"/*) : ;;
  *) echo "error: DIR resolves outside the fixture root: $DIR" >&2; exit 1 ;;
esac

cd "$ANALYZE_DIR"
FOUND=""
while read -r f; do
  node zstd-scan.mjs "$f" _scan.jsonl >/dev/null 2>&1 || continue
  if grep -q "\"agentPreset\":\"cordis\"" _scan.jsonl; then continue; fi
  if grep -q "\"agentPreset\":\"$VAR\"" _scan.jsonl && grep '"type":"agent/inbox/spliced"' _scan.jsonl | grep -q "$DIR"; then FOUND="$f"; break; fi
done < <(find ~/.dsh/sessions -name "session.jsonl.zstd" -printf "%T@ %p\n" | sort -rn | cut -d' ' -f2-)
if [ -z "$FOUND" ]; then echo "SESSION NOT FOUND for $VAR/$DIR"; exit 1; fi
node zstd-scan.mjs "$FOUND" "round$RUN.jsonl" >/dev/null
OUT=$(node analyze-session.mjs "round$RUN.jsonl" 2>/dev/null || true)
WE=$(echo "$OUT" | grep -oP 'we=\K[0-9]+' | head -1); WE=${WE:-0}
LM=$(echo "$OUT" | grep -oP 'let_me=\K[0-9]+' | head -1); LM=${LM:-0}
LABEL=$(echo "$OUT" | grep -oP 'first block label: \K.*' | head -1)
CH=$(node cache-ledger.mjs "round$RUN.jsonl" | grep -c "TOOLS-CHANGED" || true)
ERR=$(grep -c "callable directly" "round$RUN.jsonl" || true)
RATIO=$(python3 -c "w=$WE; l=$LM; d=w+l; print(f'{(w/d):.2f}' if d else '0.00')")
echo "$RUN,$VAR,$TASK,$DIR,$DONE,$LABEL,$WE,$LM,$RATIO,$CH,$ERR" >> "$RESULTS_CSV"
cd "$FIXTURE_ROOT"
case "$TASK" in
  fix) rm -rf "$FIXTURE_DIR/__pycache__"; cp buggy.py test_buggy.py "$FIXTURE_DIR/" ;;
  build) rm -rf "$FIXTURE_DIR"/* ;;
  long) rm -rf "$FIXTURE_DIR"; cp -r templates/long "$FIXTURE_DIR" ;;
  parse) rm -rf "$FIXTURE_DIR"/* ;;
  git) rm -rf "$FIXTURE_DIR"; mkdir -p "$FIXTURE_DIR" ;;
esac
echo "run=$RUN $VAR/$TASK/$DIR done=$DONE | label=$LABEL | we=$WE let_me=$LM ratio=$RATIO | changes=$CH err=$ERR | fixture reset OK"
