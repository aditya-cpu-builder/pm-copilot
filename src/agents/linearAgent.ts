import { BaseAgent } from './baseAgent';
import { mcpManager } from '../utils/mcpClient';

export class LinearAgent extends BaseAgent {
    constructor(subdomain: string) {
        const toolNames = [
            'linear_save_project',
            'linear_save_milestone',
            'linear_save_issue',
            'linear_create_document'
        ];
        const tools = mcpManager.getSpecificTools(toolNames);
        
        const prompt = `You are the Linear Agent. Your ONLY job is to CREATE and UPDATE resources in Linear for subdomain: ${subdomain}.

YOUR TOOLS:
- linear_save_project: Create/Update projects.
- linear_save_milestone: Create/Update milestones.
- linear_save_issue: Create issues (sub-requirements).
- linear_create_document: Create project briefs/docs.

RULES:
1. **WRITE ONLY**: You never read or search. Use the context provided to you.
2. **APPROVAL FIRST**: Before calling any tool, you MUST show your Plan to the PM and wait for their explicit approval.
3. **Be Precise**: Use IDs and data provided in the context pulse.

You are called after a PRD or Strategy doc is generated and the PM wants to sync with Linear.`;

        super('LinearAgent', prompt, tools);
    }

    async executeTool(name: string, input: any) {
        // Implementation of approval would typically happen in the run() override or here.
        // For now, we follow the BaseAgent pattern and assume the LLM follows prompt instructions to ask first.
        return mcpManager.executeTool(name, input);
    }
}
