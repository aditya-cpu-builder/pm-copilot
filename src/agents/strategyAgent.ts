import { BaseAgent } from './baseAgent';
import * as fs from 'fs';
import * as path from 'path';
import { mcpManager } from '../utils/mcpClient';
import { formatValidator } from '../hooks/formatValidator';

export class StrategyAgent extends BaseAgent {
    constructor(subdomain: string) {
        const skillPath = path.join(process.cwd(), '.claude', 'skills', 'generate-strategy.md');
        const skillRules = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : '';
        
        const toolNames = [
            'coda_coda_get_page_content',
            'linear_get_issue',
            'coda_coda_create_page'
        ];
        const mcpTools = mcpManager.getSpecificTools(toolNames);

        const prompt = `You are the Strategy Agent for: ${subdomain}.
You specialize in generating strategy roadmaps and feature specs.

WORKFLOW:
1. Use the Context References (IDs/Titles) found by the Grep Agent.
2. Fetch full content of ONLY relevant docs (max 3) using your tools.
3. Develop a strategy/roadmap using the context.
4. Save to Coda or workspace using your tools.

CRITICAL RULES:
- **Max 3 fetches**: Do not call get tools more than 3 times total.
- **Plan first**: Provide an execution outline to the PM for approval before writing.
- **Sources**: Map all consumed artifacts in a ## Sources footer.
- **Assumptions**: Flag any non-certified analytical logic patterns using '> ⚠️ Assumption'.

YOUR TOOLS:
- coda_coda_get_page_content: Fetch Coda documentation context.
- linear_get_issue: Fetch Linear ticket context.
- coda_coda_create_page: Save strategy docs back to Coda.
- write_file: Save the generated strategy doc to the local workspace.

${skillRules}`;

        super('StrategyAgent', prompt, [
            ...mcpTools,
            {
                name: 'write_file',
                description: 'Write the generated strategy document to the workspace.',
                input_schema: {
                    type: 'object',
                    properties: { filepath: { type: 'string' }, content: { type: 'string' } },
                    required: ['filepath', 'content']
                }
            }
        ]);
    }

    async executeTool(name: string, input: any) {
        if (name === 'write_file') {
            formatValidator(input.content);
            const dest = path.join(process.cwd(), input.filepath);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, input.content, 'utf-8');
            return `Successfully saved strategy artifact payload directly back to ${input.filepath}`;
        }
        return mcpManager.executeTool(name, input);
    }
}
