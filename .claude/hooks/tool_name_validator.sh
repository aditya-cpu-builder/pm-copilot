#!/bin/bash
# PreToolUse hook: Validates no dots in tool names (Cerebras schema issue)
INPUT=$(cat)
if echo "$INPUT" | grep -qE '"name":\s*"[^"]*\.[^"]*"'; then
  echo '{"error": "Tool name cannot contain dots."}'
  exit 1
fi
echo "$INPUT"
exit 0
