#!/bin/bash
# PreToolUse hook: PM can only access payments domain docs.
# Read input JSON from stdin and validate domain
INPUT=$(cat)
if echo "$INPUT" | grep -iq "domain" && ! echo "$INPUT" | grep -iq '"payments"'; then
  echo '{"error": "Access Denied: You may only access the payments domain."}'
  exit 1
fi
echo "$INPUT"
exit 0
