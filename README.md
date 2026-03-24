# PM Copilot 🚀

PM Copilot is an AI-powered assistant designed to help Product Managers transition seamlessly from user research and context gathering to PRD generation, strategy roadmaps, and UI/UX design.

## 🏗 Architecture (Lean v2.0)

PM Copilot follows a **Hub-and-Spoke** architecture optimized for Cerebras (Qwen3-32B). To ensure maximum reliability, each agent is limited to **max 4 tools**.

- **Coordinator**: The central router that orchestrates the flow. Uses "Native Routing" to trigger specialists.
- **Grep Agent**: The discovery specialist. Uses read-only tools to find relevant Coda docs, Linear tickets, and Figma files.
- **PRD Agent**: Synthesizes Product Requirements Documents based on grep context.
- **Strategy Agent**: Develops roadmaps and feature specs.
- **Design Agent**: Generates UI mockups using Google Stitch and references existing Figma designs.
- **Linear Agent**: A write-only agent that syncs approved plans back to Linear.

## 🛠 Integrations

- **Linear**: Project tracking and issue management.
- **Coda**: Document collaboration and knowledge base.
- **Figma**: Design inspection and asset reference.
- **Google Stitch**: AI-powered UI design generation.

## 🚀 Getting Started

### Prerequisites
- Node.js & npm
- MCP Servers configured in `.mcp.json`
- Environment variables set in `.env` (Cerebras, Linear, Coda, Figma, Stitch)

### Running Locally
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the copilot:
   ```bash
   ./start-copilot.sh
   ```

## 📜 Project Structure
- `src/agents/`: Core agent logic and tool mappings.
- `src/chat/`: Command handlers and UI integration.
- `src/utils/`: MCP client management and LLM utilities.
- `.claude/rules/`: Domain-specific rules and constraints.
- `.claude/skills/`: Specialist prompts and skills.

## 🛡 Security & Constraints
- All tool names use underscores only for Cerebras compatibility.
- Mandatory PM approval before any file writes or Linear updates.
- PII redaction and domain access checks enforced via hooks.
