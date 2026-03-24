# PM Copilot — Engineering Design Document
**Version:** 1.0 (POC)  
**Status:** Draft  
**Platform:** VS Code / Cursor Extension  
**Team scope:** Payments only (V1)  
**Inference:** Cerebras  
**Agent SDK:** Claude Agent SDK + HydraProxy (translates to Cerebras)  
**Date:** March 2026

---

## 1. Overview

PM Copilot is an AI-powered IDE extension that gives product managers a chat interface inside VS Code and Cursor. PMs can query project context, generate PRDs, create strategy documents, and trigger Figma wireframe generation — without leaving their workspace.

V1 is scoped to the Payments team only. It connects to four systems via MCP: Linear, Coda, Google Stitch, and Figma. All agents run on Cerebras for high-speed inference.

---

## 2. Problem Statement

- **Scattered context** — Linear, Coda, and Figma live in separate tools. A PM writing a PRD manually checks 3–4 systems before starting.
- **No standard format** — PRDs and strategy docs vary in quality across PMs and teams.
- **Slow from idea to artifact** — Writing a PRD takes hours. Design briefing is a separate process.

---

## 3. Jobs To Be Done

| # | Job | PM Says | System Does |
|---|-----|---------|-------------|
| 1 | Query context | "What has the payments team shipped recently?" | Greps Linear + Coda → fetches relevant results → summarises |
| 2 | Generate PRD | "Write a PRD for revamping checkout" | Fetches context → adaptive form → plan → PRD file saved |
| 3 | Generate strategy doc | "Create a Q3 payments strategy" | Same flow, different format template |
| 4 | Generate Figma designs | "Create wireframes for new checkout flow" | Brief → Stitch → Figma frames created |

---

## 4. System Architecture

### 4.1 Agent Architecture — Hub and Spoke

One coordinator agent routes to four specialist subagents. Each subagent has **isolated context** — it only knows what the coordinator explicitly passes to it.

```
PM types request
    → Coordinator Agent (Cerebras)
        → classifies intent
        → routes to specialist with explicit context
            → Context Agent      (query flow)
            → PRD Agent          (PRD flow)
            → Strategy Agent     (strategy flow)
            → Design Agent       (Figma flow)
        → aggregates result
        → returns to PM in chat
```

### 4.2 Agent Definitions

| Agent | Role | Tools (max 5) |
|-------|------|---------------|
| Coordinator | Routes intent, manages session, aggregates | `classify_intent`, `route_to_agent`, `read_session_file` |
| Context Agent | Greps + fetches context from Linear/Coda | `linear_grep`, `coda_grep`, `linear_fetch`, `coda_fetch` |
| PRD Agent | Generates form, writes PRD, saves file | `coda_grep`, `figma_fetch`, `write_file`, `read_file` |
| Strategy Agent | Generates form, writes strategy, saves file | `coda_grep`, `linear_grep`, `write_file`, `read_file` |
| Design Agent | Generates wireframes via Stitch + Figma | `stitch_generate`, `figma_create_frame`, `figma_fetch` |

> **Tool naming rule:** All tool names use underscores only (no dots). Cerebras schema validation fails on dots in tool names.

### 4.3 Model, SDK & The HydraProxy Trick

**The problem:**
Claude Agent SDK is the best agent framework available — full agentic loop, 15+ tools, MCP support, session management, hooks, all built in. But it only works with Claude models. We want Cerebras speed AND Claude Agent SDK. HydraProxy makes this possible.

**How it works:**

HydraProxy (from [HydraTeams](https://github.com/Pickle-Pixel/HydraTeams)) is a translation proxy. The Claude Agent SDK thinks it's talking to Anthropic. The proxy intercepts every call, translates Anthropic format → OpenAI format, forwards to Cerebras, translates the response back, and returns it to the SDK.

```
Claude Agent SDK
    ↓  POST /v1/messages (Anthropic format)
    ↓  ANTHROPIC_BASE_URL=http://localhost:3456
HydraProxy (localhost:3456)
    ↓  translates to OpenAI Chat Completions format
    ↓  POST https://api.cerebras.ai/v1/chat/completions
Cerebras (qwen-3-235b-a22b-instruct-2507)
    ↑  OpenAI SSE stream response
HydraProxy
    ↑  translates back to Anthropic SSE format
Claude Agent SDK
    ↑  thinks it received a Claude response. Has no idea.
```

**Why this works without code changes:**
Cerebras is OpenAI-compatible. HydraProxy already has an OpenAI Chat Completions translator built in. We just point it at Cerebras's endpoint with `--target-url`.

**Setup:**
```bash
# 1. Clone and build HydraProxy
git clone https://github.com/Pickle-Pixel/HydraTeams.git
cd HydraTeams && npm install && npm run build

# 2. Start proxy pointed at Cerebras
node dist/index.js \
  --model qwen-3-235b-a22b-instruct-2507 \
  --provider openai \
  --target-url https://api.cerebras.ai/v1/chat/completions \
  --port 3456

# 3. Set environment variables
export ANTHROPIC_BASE_URL=http://localhost:3456
export ANTHROPIC_API_KEY=dummy    # SDK requires it, proxy ignores it
export CEREBRAS_API_KEY=your-key  # Proxy uses this for Cerebras
```

**What you get:**
- Full Claude Agent SDK — agentic loop, hooks, MCP, session management, all tools
- Cerebras inference — 3,000+ tokens/second
- Zero changes to agent code — it all looks like Claude to the SDK

**Install for VS Code extension:**
```bash
npm install @anthropic-ai/claude-code
```

---

## 5. MCP Connections

```json
// .mcp.json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["@linear/mcp-server"],
      "env": { "LINEAR_API_KEY": "${LINEAR_API_KEY}" }
    },
    "coda": {
      "command": "npx",
      "args": ["@coda/mcp-server"],
      "env": { "CODA_API_KEY": "${CODA_API_KEY}" }
    },
    "stitch": {
      "command": "npx",
      "args": ["@google/stitch-mcp-server"],
      "env": { "STITCH_API_KEY": "${STITCH_API_KEY}" }
    },
    "figma": {
      "command": "npx",
      "args": ["@figma/mcp-server"],
      "env": { "FIGMA_API_KEY": "${FIGMA_API_KEY}" }
    }
  }
}
```

> **Security:** Never hardcode API keys. All values use `${ENV_VAR}` and live on each user's machine only.

---

## 6. Context & Session Management

This is the operational backbone of the tool. Every session has a lifecycle.

### 6.1 Session Files

Every conversation creates a session file automatically. Session files are the tool's memory — they enable crash recovery, resumption, and context injection.

```
/workspace/.pm-copilot/sessions/
    session_2026-03-21_checkout-prd.md      ← named session
    session_2026-03-21_q3-strategy.md
    session_2026-03-20_autopay-research.md
```

**What goes in a session file:**
- Session name and timestamp
- Domain and subdomain being worked on
- Resources fetched (links, not full content)
- Key decisions and findings
- Current status: `active` | `completed` | `crashed`
- Last tool call that completed successfully

### 6.2 Slash Commands — Session Management

| Command | What it does |
|---------|-------------|
| `/clear` | Clears current context window. Saves a session summary file before clearing. Starts fresh. |
| `/init [session-name]` | Injects a previous session's summary as context. Use when resuming after `/clear` or crash. |
| `/fork [branch-name]` | Creates a parallel copy of current session to explore two approaches simultaneously. Changes in fork never affect original. |
| `/sessions` | Lists all saved session files in the workspace. |
| `/status` | Shows current session: what's been fetched, what's been written, current status. |

### 6.3 Session Lifecycle

```
New request
    → Session file created automatically
    → Work happens (fetches, form, writing)
    → Session file updated after each tool call
    → Document saved to workspace

If crash:
    → Session file shows last completed tool call
    → On restart: agent reads session file
    → Re-runs only incomplete tool calls
    → Continues from where it left off

If context gets too long:
    → PM types /clear
    → Agent saves session summary to session file
    → Context cleared
    → PM types /init [session-name] to re-inject summary
    → Agent continues with clean context + injected summary
```

### 6.4 Resume vs Start Fresh Decision

| Situation | Action |
|-----------|--------|
| Brief interruption, same session | Resume — context still fresh |
| Context window getting long | `/clear` → `/init` |
| Coda/Linear docs have changed significantly | Start fresh, `/init` to inject old findings |
| Exploring two approaches | `/fork` — both branches start with same context |
| Crash detected | Auto-recovery using session file |

---

## 7. Grep Pattern — Context Discovery

Before fetching any document, the agent always greps first. This prevents flooding the context window with irrelevant content.

### 7.1 How Grep Works Here

`coda_grep` and `linear_grep` scan document titles, tags, and metadata. They return a list of matching document references — not full content. The agent then fetches only the relevant ones.

```
PM: "Write a PRD for checkout revamp"

❌ Wrong:
Agent fetches all payments Coda docs → reads all → floods context

✅ Right:
Agent greps Coda for "checkout" in payments domain
→ Returns: checkout_architecture.md, checkout_prd_v1.md, checkout_figma_brief.md
Agent reads only those 3 files
→ Lean context, relevant content only
```

### 7.2 Grep → Fetch → Act Pattern

Every document-writing flow follows this order:

```
1. Grep    → find which docs are relevant (by keyword + domain)
2. Fetch   → read only the relevant docs
3. Map     → understand what exists, what's missing
4. Form    → generate adaptive questions for what's missing
5. Plan    → show outline, wait for PM approval
6. Write   → generate the document
7. Save    → write to /workspace/{type}/{slug}.md
8. Log     → update session file
```

---

## 8. Detailed User Flows

### 8.1 Context Query

```
PM: "What has the payments team done in Linear this week?"

1. Coordinator classifies → context_query
2. Routes to Context Agent with: domain=payments, timeframe=last_7_days
3. Context Agent:
   → linear_grep(team=payments, date=last_7_days)
   → Returns list of matching tickets
   → linear_fetch(ticket_ids=[...])
   → Summarises in plain English
4. Response in chat with ticket links
5. Session file updated with: resources fetched, summary
```

No file created. Chat response only.

---

### 8.2 PRD Generation

```
PM: "Write a PRD for revamping the checkout page"

1. Coordinator classifies → prd_generation
2. Routes to PRD Agent with: domain=payments, subdomain=checkout, request=revamp

3. PRD Agent — Map phase:
   → coda_grep(domain=payments, query=checkout)
   → Returns: checkout_architecture.md, checkout_prd_v1.md
   → figma_fetch(project=payments-checkout)
   → Returns: current design files
   → coda_fetch(docs=[checkout_architecture.md, checkout_prd_v1.md])

4. PRD Agent — Form phase:
   → Identifies what context is missing
   → Generates adaptive form with only the missing questions
   → PM fills form in VS Code panel

5. PRD Agent — Plan phase:
   → Generates PRD outline
   → Shows to PM for approval before writing
   → PM approves / requests changes

6. PRD Agent — Write phase:
   → Writes full PRD with sub-requirements
   → Saves to /workspace/prds/checkout-revamp-prd.md

7. Session file updated throughout
```

> Adaptive questions are generated based on what context is **missing** — not a fixed questionnaire. If Coda already has checkout architecture, the agent won't ask about it.

---

### 8.3 Strategy Doc Generation

Same flow as PRD. Differences:
- Format template is different (configured in admin backend)
- Context greps Linear for recent progress + Coda for existing strategy
- Saved to `/workspace/strategy/payments-q3-strategy.md`

---

### 8.4 Figma Design Generation

```
PM: "Create wireframes for the new checkout flow"

1. Coordinator classifies → design_generation
2. Routes to Design Agent with: domain=payments, subdomain=checkout

3. Design Agent — Map phase:
   → figma_fetch(project=payments) → existing designs
   → coda_grep(domain=payments, query=checkout specs) → spec docs

4. Design Agent — Form phase:
   → Generates form: screen count, platform (mobile/web), style reference
   → PM fills form

5. Design Agent — Generate phase:
   → stitch_generate(brief=...) → generates design
   → figma_create_frame(project=payments, frames=[...])

6. Chat returns Figma link
7. Session file updated
```

No local file saved. Figma link returned in chat.

---

## 9. CLAUDE.md Configuration

### 9.1 Project-Level Rules (`.claude/CLAUDE.md`)

```markdown
# PM Copilot — Project Rules

## Context Discovery
- Always grep before fetching. Never fetch all docs blindly.
- Use coda_grep and linear_grep to identify relevant docs first.
- Fetch only the documents that grep returns as relevant.

## Document Generation
- Never write a solution section before a problem section.
- Always generate a plan and wait for PM approval before writing.
- Adaptive form questions must only cover what context is missing.
- Do not ask questions whose answers are already in fetched docs.

## Session Management
- Create a session file at the start of every new conversation.
- Update session file after every completed tool call.
- On /clear: save session summary before clearing context.
- On /init: inject the referenced session file as context.
- On /fork: copy current session state to new branch file.

## File Output
- Save PRDs to /workspace/prds/{slug}-prd.md
- Save strategy docs to /workspace/strategy/{slug}-strategy.md
- Session files saved to /workspace/.pm-copilot/sessions/

## Formatting
- Use the format template from admin config for all documents.
- Never skip required sections (problem, solution, metrics for PRDs).
```

### 9.2 Path-Specific Rules (`.claude/rules/`)

**`.claude/rules/prd.md`**
```yaml
paths:
  - "**/*-prd.md"
rules:
  - Always include: Problem, Solution, Success Metrics, Sub-requirements
  - Never skip the metrics section
  - Sub-requirements must be broken into individual testable items
```

**`.claude/rules/strategy.md`**
```yaml
paths:
  - "**/*-strategy.md"
rules:
  - Always include: Context, Goals, Initiatives, Risks, Linear progress
  - Reference recent Linear tickets as evidence for current state
```

### 9.3 Slash Commands (`.claude/commands/`)

| Command file | Triggered by | Does |
|-------------|--------------|------|
| `new-prd.md` | `/new-prd {subdomain}` | Starts PRD generation flow for given subdomain |
| `new-strategy.md` | `/new-strategy {subdomain}` | Starts strategy doc flow |
| `new-design.md` | `/new-design {subdomain}` | Starts Figma design flow |
| `clear.md` | `/clear` | Saves session summary, clears context |
| `init.md` | `/init {session-name}` | Injects session file as context |
| `fork.md` | `/fork {branch-name}` | Forks current session into a new branch |
| `sessions.md` | `/sessions` | Lists all session files |
| `status.md` | `/status` | Shows current session state |

### 9.4 Skills (`.claude/skills/`)

| Skill file | Triggered by | Uses `context:fork` | Allowed tools |
|-----------|--------------|---------------------|---------------|
| `generate-prd.md` | `/new-prd` | Yes | `coda_grep`, `coda_fetch`, `figma_fetch`, `write_file` |
| `generate-strategy.md` | `/new-strategy` | Yes | `coda_grep`, `linear_grep`, `linear_fetch`, `write_file` |
| `generate-design.md` | `/new-design` | Yes | `figma_fetch`, `stitch_generate`, `figma_create_frame` |

> Skills use `context:fork` — they run in isolated sub-agent context so they don't flood the main conversation.

---

## 10. Hooks & Compliance

| Hook | Type | Enforces |
|------|------|---------|
| `domain_access_check` | PreToolUse | PM can only access payments domain docs. Blocks cross-domain access. |
| `format_validator` | PostToolUse | After `write_file` — validates required sections exist before saving. |
| `pii_redactor` | PostToolUse | After any Linear/Coda fetch — strips customer PII before passing to agent. |
| `figma_scope_check` | PreToolUse | Before `figma_create_frame` — checks PM has edit access. |
| `tool_name_validator` | PreToolUse | Blocks any tool call with dots in the name (Cerebras schema issue). |

---

## 11. Error Handling

| Error type | Example | Handling |
|-----------|---------|---------|
| Transient | Linear API timeout | Subagent retries 2x silently. If still failing → propagates to coordinator with full context. |
| Validation | PM requests unknown subdomain | Agent asks PM to clarify. Does not proceed until resolved. |
| Business | PM tries to access another team's docs | PreToolUse hook blocks. Returns clear message. |
| Permission | Figma edit access denied | PreToolUse hook blocks. Returns link to request access. |
| Crash | Session interrupted mid-tool-call | Session file identifies last completed step. Agent re-runs incomplete tool calls only. |

---

## 12. File Structure

```
my-pm-copilot/
├── .mcp.json                          # MCP connections (no secrets)
├── .claude/
│   ├── CLAUDE.md                      # Project-level rules (always active)
│   ├── rules/
│   │   ├── prd.md                     # Rules for *-prd.md files
│   │   └── strategy.md                # Rules for *-strategy.md files
│   ├── commands/
│   │   ├── new-prd.md                 # /new-prd command
│   │   ├── new-strategy.md            # /new-strategy command
│   │   ├── new-design.md              # /new-design command
│   │   ├── clear.md                   # /clear command
│   │   ├── init.md                    # /init command
│   │   ├── fork.md                    # /fork command
│   │   ├── sessions.md                # /sessions command
│   │   └── status.md                  # /status command
│   └── skills/
│       ├── generate-prd.md            # PRD generation skill (context:fork)
│       ├── generate-strategy.md       # Strategy doc skill (context:fork)
│       └── generate-design.md         # Figma design skill (context:fork)
└── workspace/
    ├── prds/                          # Generated PRD files
    ├── strategy/                      # Generated strategy docs
    └── .pm-copilot/
        └── sessions/                  # Session files (auto-created)
```

---

## 13. V1 Scope

| In Scope | Out of Scope (V2+) |
|----------|-------------------|
| Payments team only | Multi-team support with dynamic team creation |
| Context query via chat | Real-time collaboration between PMs |
| PRD generation with adaptive form | Version history / doc diffing |
| Strategy doc generation | Slack integration |
| Figma wireframe generation | Automated Linear ticket creation from PRD |
| Session management (clear, init, fork) | Mobile app |
| Grep-first context discovery | Public sharing of docs |
| Crash recovery via session files | Dynamic team configuration via admin |
| Admin backend (format config only) | |

---

## 14. Coordinator System Prompt

```
You are PM Copilot, an AI assistant for product managers at [Company Name].
You live inside VS Code/Cursor as a chat interface.

INFERENCE: You run on Cerebras (Qwen3-32B).

YOUR ROLE:
You are the coordinator agent. You receive PM requests, understand intent,
and route to the right specialist agent. You never do the work yourself —
you delegate, then aggregate and present results.

V1 SCOPE — PAYMENTS TEAM ONLY:
Domain: Payments
Subdomains: autopay, refunds, repayments, checkout

ROUTING RULES:
- "what has X team done" / "recent updates" / "Linear status" → Context Agent
- "write a PRD" / "create a PRD" / "document this feature" → PRD Agent
- "strategy doc" / "quarterly strategy" / "roadmap" → Strategy Agent
- "wireframes" / "designs" / "Figma" / "mockups" → Design Agent

BEFORE ROUTING:
1. Identify which subdomain the request belongs to
2. Pass domain + subdomain explicitly to the specialist agent
3. Pass the current session file path so the specialist can log progress
4. If subdomain is unclear, ask the PM first — never assume

SESSION MANAGEMENT:
- On every new conversation: create a session file in /workspace/.pm-copilot/sessions/
- Name format: session_{date}_{slug}.md
- Pass session file path to every specialist agent
- On /clear: summarise current session into session file, then clear context
- On /init {name}: read the named session file and inject as context
- On /fork {name}: copy current session file to new branch file, continue independently
- On /status: read current session file and report what's been done

TOOL NAMING RULE:
All tool names use underscores only. Never dots. This is required for
Cerebras schema compatibility.

WHAT YOU NEVER DO:
- Never write PRDs, strategy docs, or designs yourself
- Never fetch Coda or Linear data yourself
- Never skip the plan approval step before any document is generated
- Never access docs outside the payments domain
- Never fetch all documents — always grep first to find relevant ones

TONE:
Professional and direct. You are a tool, not a chatbot. Keep responses
concise. When routing, briefly tell the PM what's happening:
"Getting your payments checkout context — this will take a moment."

ERROR HANDLING:
- Transient errors: retry up to 2x silently, then report to PM with context
- Validation errors: ask PM to clarify, do not proceed until resolved
- Business/permission errors: report clearly with next steps
- Always update session file with error state before stopping
```

---

*PM Copilot V1 — EDD — March 2026*

---

## 15. Hallucination Guardrails

LLMs can fabricate content — especially when context is thin. For a PM tool generating official documents, this is a real risk.

### 15.1 The Problem

Without guardrails, the agent might:
- Invent Linear tickets that don't exist
- Fabricate Coda doc contents it didn't actually fetch
- Generate PRD sections based on assumptions rather than real data
- Reference "previous decisions" that were never made

### 15.2 Guardrails by Layer

**Layer 1 — Grep before fetch (already in architecture)**
Agent must grep first. If grep returns nothing, agent stops and asks PM for clarification. It does not proceed with assumptions.

**Layer 2 — Source attribution in documents**
Every generated PRD and strategy doc must include a sources section:
```
## Sources
- Coda: checkout_architecture.md (fetched 2026-03-21)
- Coda: checkout_prd_v1.md (fetched 2026-03-21)
- Figma: payments-checkout project (fetched 2026-03-21)
- Linear: 3 tickets from payments team (last 30 days)
```
If a section has no source, it must be explicitly marked as assumption:
```
> ⚠️ Assumption — no source found. Verify before publishing.
```

**Layer 3 — Adaptive form for missing context**
When context is missing, the agent generates a form asking the PM to fill in the gaps. It does not invent answers to fill those gaps itself.

**Layer 4 — Plan approval before writing**
Agent always shows the plan (what it found, what it's about to write) before generating the document. PM approves or corrects before execution. This is the last checkpoint before hallucinated content could enter a document.

**Layer 5 — CLAUDE.md rule**
Add to project CLAUDE.md:
```
Never fabricate information. If context is missing, say so explicitly.
Never reference documents you did not fetch in this session.
Always mark assumptions clearly with ⚠️ Assumption.
```

**Layer 6 — PostToolUse hook: source validator**
After `write_file`, a hook checks that every factual claim in the document has a corresponding entry in the sources section. If a section references context that wasn't fetched, it flags it before saving.

### 15.3 What This Does NOT Solve

These guardrails reduce hallucination but do not eliminate it. The LLM can still:
- Misread a fetched document and extract wrong information
- Confuse similar document names
- Make subtle logic errors in reasoning

Human review before publishing any generated document is always recommended.