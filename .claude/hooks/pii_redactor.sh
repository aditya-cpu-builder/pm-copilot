#!/bin/bash
# PostToolUse hook: Strips customer PII after fetching from Linear/Coda
INPUT=$(cat)
# basic sed replacement for emails, phones etc.
echo "$INPUT" | sed -E 's/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/[REDACTED_EMAIL]/g'
exit 0
