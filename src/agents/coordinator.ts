import { BaseAgent } from './baseAgent';
import { GrepAgent } from './grepAgent';
import { PrdAgent } from './prdAgent';
import { StrategyAgent } from './strategyAgent';
import { DesignAgent } from './designAgent';
import { LinearAgent } from './linearAgent';
import { mcpManager } from '../utils/mcpClient';

export class CoordinatorAgent extends BaseAgent {
    constructor() {
        // Coordinator has NO MCP tools. It only has internal 3 tools as per rule.
        // But user said NO TOOL CALLS for routing. So we only keep read_session_file as a tool if needed.
        const prompt = `You are PM Copilot Coordinator.

YOUR ROLE:
1. **Classify Intent**: Determine what the PM wants (PRD, Strategy, Design, Linear Sync, or Questions).
2. **Route Session**: Use "Native Routing" to trigger specialists.
3. **Read Session**: You can read current session state from the workspace.

NATIVE ROUTING:
If the request requires a specialist, you MUST output a ROUTE BLOCK at the end of your response:
[ROUTE: agent="AGENT_TYPE", subdomain="SUBDOMAIN", intent="SPECIFIC_INTENT"]

AGENT_TYPES: grep_agent (for just searching), prd_agent, strategy_agent, design_agent, linear_agent.

ORCHESTRATION RULES:
- For PRD/Strategy/Design: ALWAYS route to grep_agent first if you need to find context. 
- You can also "Chain" by saying "I will now search for context" and the system will handle the Grep -> Specialist flow.
- For Linear Sync: Route to linear_agent.

DIRECT ANSWERS:
If it's a simple greeting or a capability question (e.g. "what can you do?"), answer directly without a route block.

MCP STATUS:
- Connected: ${mcpManager.getConnectionStatus().connected.join(', ')}
- Available specialists: PRD, Strategy, Design, Linear.

TONE: Professional, concise product leader.`;

        super('CoordinatorAgent', prompt, [
            {
                name: 'read_session_file',
                description: 'Read the current session state file from .pm-copilot/sessions/',
                input_schema: {
                    type: 'object',
                    properties: { session_id: { type: 'string' } },
                    required: ['session_id']
                }
            }
        ]);
    }

    /**
     * Override run to implement Native Routing and Orchestration
     */
    async run(messages: any[]): Promise<any> {
        // Step 1: Run standard BaseAgent for classification/routing decision
        const initialResponse = await super.run(messages);
        const textContent = initialResponse.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');

        // Step 2: Check for Route Block
        const routeMatch = textContent.match(/\[ROUTE:\s*agent="([^"]+)",\s*subdomain="([^"]+)",\s*intent="([^"]+)"\]/);
        
        if (!routeMatch) {
            return initialResponse; // Direct answer
        }

        const [, agentType, subdomain, intent] = routeMatch;
        console.log(`[Coordinator] Native Route detected: ${agentType} | ${subdomain} | ${intent}`);

        // Step 3: Orchestrate flow
        let finalContext = "";
        
        // Always Grep first for Specialists (PRD, Strategy, Design, Linear)
        if (['prd_agent', 'strategy_agent', 'design_agent', 'linear_agent'].includes(agentType)) {
            console.log(`[Coordinator] Phase 1: Grep Discovery...`);
            const grepAgent = new GrepAgent(subdomain);
            const grepResult = await grepAgent.run([{ role: 'user', content: `Find relevant document references and IDs for this request: "${intent}"` }]);
            const grepOutput = grepResult.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
            finalContext = `[GREP CONTEXT]:\n${grepOutput}`;
            console.log(`[Coordinator] Filtered Context: ${grepOutput.substring(0, 50)}...`);
        }

        // Step 4: Run Specialist
        let specialist;
        switch(agentType) {
            case 'grep_agent': specialist = new GrepAgent(subdomain); break;
            case 'prd_agent': specialist = new PrdAgent(subdomain); break;
            case 'strategy_agent': specialist = new StrategyAgent(subdomain); break;
            case 'design_agent': specialist = new DesignAgent(subdomain); break;
            case 'linear_agent': specialist = new LinearAgent(subdomain); break;
            default: return initialResponse;
        }

        const specialistPrompt = finalContext 
            ? `CONTEXT:\n${finalContext}\n\nUSER REQUEST: ${intent}`
            : intent;

        // Pass context of the conversation so the specialist knows what was already discussed
        const chatContext = messages.slice(-5).filter(m => m.role !== 'system');
        const specialistResult = await specialist.run([
            ...chatContext,
            { role: 'user', content: specialistPrompt }
        ]);
        const specialistOutput = specialistResult.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');

        // Step 5: Synthesize Final Payload
        return {
            content: [
                { type: 'text', text: textContent },
                { type: 'text', text: `\n\n--- [${agentType} Output] ---\n${specialistOutput}` }
            ]
        };
    }

    async executeTool(name: string, input: any) {
        if (name === 'read_session_file') {
            // Implementation...
            return `Session data placeholder for ${input.session_id}`;
        }
        return super.executeTool(name, input);
    }
}
