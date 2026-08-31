#!/usr/bin/env bash
# 用法: ./round-bookkeep.sh <run> <variant> <task> <dir> <done>
# 找会话(按 mtime 从新到旧,内容含 <dir> 且 agentPreset=<variant>)→ 分析 → 追加 CSV → 重置夹具。
set -euo pipefail
RUN=$1; VAR=$2; TASK=$3; DIR=$4; DONE=$5
cd /home/andy/dsh/research/analyze
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
echo "$RUN,$VAR,$TASK,$DIR,$DONE,$LABEL,$WE,$LM,$RATIO,$CH,$ERR" >> /home/andy/dsh/research/results.csv
cd /home/andy/dsh/test-fixtures
case "$TASK" in
  fix) rm -rf "$DIR/__pycache__"; cp buggy.py test_buggy.py "$DIR/" ;;
  build) rm -rf "$DIR"/* ;;
  long) rm -rf "$DIR"; cp -r templates/long "$DIR" ;;
  parse) rm -rf "$DIR"/* ;;
  git) rm -rf "$DIR"; mkdir -p "$DIR" ;;
esac
echo "run=$RUN $VAR/$TASK/$DIR done=$DONE | label=$LABEL | we=$WE let_me=$LM ratio=$RATIO | changes=$CH err=$ERR | fixture reset OK"
