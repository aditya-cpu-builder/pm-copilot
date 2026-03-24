import { BaseAgent } from './baseAgent';
import * as fs from 'fs';
import * as path from 'path';
import { mcpManager } from '../utils/mcpClient';
import { formatValidator } from '../hooks/formatValidator';

export class PrdAgent extends BaseAgent {
    constructor(subdomain: string) {
        const skillPath = path.join(process.cwd(), '.claude', 'skills', 'generate-prd.md');
        const skillRules = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : '';
        
        const toolNames = [
            'coda_coda_get_page_content',
            'figma_get_file_nodes',
            'linear_get_issue'
        ];
        const mcpTools = mcpManager.getSpecificTools(toolNames);

        const prompt = `You are the PRD Agent for: ${subdomain}.
You specialize in synthesizing Product Requirements Documents.

WORKFLOW:
1. Use the Context References (IDs/Titles) found by the Grep Agent.
2. Fetch full content of ONLY relevant docs (max 3) using your tools.
3. Generate a high-quality PRD using the context.
4. Save the document to the workspace using write_file.

CRITICAL RULES:
- **Max 3 fetches**: Do not call get tools more than 3 times total.
- **Plan first**: Provide a concise plan/outline to the PM for approval before writing.
- **Sources**: Map all consumed artifacts in a ## Sources footer.
- **Assumptions**: Flag any context derived loosely using '> ⚠️ Assumption'.

YOUR TOOLS:
- coda_coda_get_page_content: Fetch full content of a Coda page.
- figma_get_file_nodes: Fetch specific nodes/designs from Figma.
- linear_get_issue: Fetch full details of a Linear ticket.
- write_file: Save the generated PRD to the workspace.

${skillRules}`;

        super('PrdAgent', prompt, [
            ...mcpTools,
            {
                name: 'write_file',
                description: 'Write the generated PRD document securely to the workspace.',
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
            return `Successfully securely published document back to ${input.filepath}`;
        }
        return mcpManager.executeTool(name, input);
    }
}
