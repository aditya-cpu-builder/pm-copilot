#!/bin/bash

# Actively source .env files directly into bash context safely
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Alias the Cerebras key explicitly into the variable that HydraProxy parses natively
export OPENAI_API_KEY=$CEREBRAS_API_KEY
export ANTHROPIC_BASE_URL="http://localhost:3456"
export ANTHROPIC_API_KEY="dummy"

echo "=============================================="
echo " Starting HydraProxy internally via Localhost "
echo "=============================================="

# Forcefully sweep and terminate any rogue old daemons still clinging to port 3456!
lsof -ti:3456 | xargs kill -9 2>/dev/null

node --env-file=.env ./HydraTeams/dist/index.js --model qwen-3-235b-a22b-instruct-2507 --provider openai --target-url https://api.cerebras.ai/v1/chat/completions --port 3456 > proxy.log 2>&1 &
PROXY_PID=$!
echo "Proxy Process Mount (PID: $PROXY_PID) established."
sleep 1

echo "=============================================="
echo " Booting PM Copilot V2 (Terminal Environment) "
echo "=============================================="
npx tsx src/index.ts

echo "Cleaning up HydraProxy Mount..."
kill $PROXY_PID
