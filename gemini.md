# PM Copilot — Development Rules

When developing PM Copilot components, strictly adhere to the following architectural and security guidelines from the EDD:

## Architecture & Agents
- **Hub and Spoke**: The system consists of 1 Coordinator Agent routing to 4 specialist subagents (Context, PRD, Strategy, Design). Each subagent has isolated context.
- **Model Standard**: All agents must use **Cerebras (Qwen3-32B)**. Do not mix models in V1.
- **Agent Roles**:
  - **Coordinator**: Routes intent, manages sessions, aggregates responses. (Tools: `classify_intent`, `route_to_agent`, `read_session_file`)
  - **Context Agent**: Greps/fetches from Linear/Coda. (Tools: `linear_grep`, `coda_grep`, `linear_fetch`, `coda_fetch`)
  - **PRD / Strategy Agents**: Generates forms, writes docs, saves files. Provide adaptive questions based on what context is missing.
  - **Design Agent**: Generates Figma wireframes via Stitch.

## Development Constraints
- **Tool Naming Rule**: All tool names must use **underscores only** (no dots!). Cerebras schema validation fails on dots. Do not create tools like `agent.do_something`. Use `agent_do_something`.
- **Security Check**: Never hardcode API keys. Use `${ENV_VAR}` in `.mcp.json` and code integrations.
- **Grep Pattern**: Ensure agents perform a 'grep-before-fetch' pattern. Never fetch full documents blindly. Use `coda_grep` and `linear_grep` to identify relevant docs first.
- **Session State**: Follow the session state lifecycle (`/workspace/.pm-copilot/sessions/`) and ensure slash commands (`/clear`, `/init`, `/fork`, `/sessions`, `/status`) interact with this properly.
- **Hooks & Validators**: Implement all PreToolUse and PostToolUse hooks as specified: `domain_access_check`, `format_validator`, `pii_redactor`, `figma_scope_check`, `tool_name_validator`. You must check for permission logic strictly.

---

## General Rules
- Before you do any work, MUST view files in .gemini/tasks/context_session_x.md file to get the full context (x being the id of the session we are operate, if file doesnt exist, then create one)
- context_session_x.md should contain most of context of what we did, overall plan, and sub agents will continusly add context to the file
- After you finish the work, MUST update the .gemini/tasks/context_session_x.md file to make sure others can get full context of what you did

### Sub agents
You have access to 11 sub agents:
- **vercel-ai-sdk-v5-expert**: all task related to vercel ai sdk HAVE TO consult this agent
- **shadcn-ui-builder**: all task related to UI building & tweaking HAVE TO consult this agent  
- **code-reviewer**: expert code review for full stack applications, security vulnerabilities, and best practices
- **frontend-expert**: frontend development, UI/UX, and user-facing development tasks
- **kiro-design**: create comprehensive feature design documents from approved requirements
- **kiro-executor**: execute specific tasks from design specifications and technical specs with focused implementation
- **kiro-plan**: create actionable implementation task lists from approved feature designs  
- **kiro-requirement**: requirements analysis and specification development using Kiro methodology
- **nextjs-expert**: Next.js application development, optimization, and architecture
- **python-backend-expert**: Python backend systems development using modern tooling like uv
- **technical-documentation-writer**: create comprehensive user manuals, tutorials, and technical documentation

Sub agents will do research about the implementation, but you will do the actual implementation;
When passing task to sub agent, make sure you pass the context file, e.g. '.gemini/tasks/session_context_x.md', 
After each sub agent finish the work, make sure you read the related documentation they created to get full context of the plan before you start executing