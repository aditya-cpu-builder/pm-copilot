import { BaseAgent } from './baseAgent';
import { mcpManager } from '../utils/mcpClient';

export class GrepAgent extends BaseAgent {
    constructor(subdomain: string) {
        const toolNames = [
            'linear_list_issues',
            'linear_list_teams',
            'coda_coda_list_documents',
            'figma_get_team_projects'
        ];
        const tools = mcpManager.getSpecificTools(toolNames);
        
        const prompt = `You are the Grep Agent. Your ONLY job is to find document references (IDs and Titles) for the subdomain: ${subdomain}.

YOUR TOOLS:
- linear_list_issues: Search Linear tickets by keyword/team.
- linear_list_teams: Find Linear teams to narrow down searches.
- coda_coda_list_documents: Search Coda docs.
- figma_get_team_projects: List Figma files.

RULES:
1. **ONLY return references**: IDs, Titles, and Links. 
2. **NEVER fetch full content**: Do not call "get" tools. Your job is discovery only.
3. **Be concise**: Return a simple list of what you found.
4. If you find nothing, say so clearly.

You are the first step in every specialist request. Find the context so the specialists can fetch it later.`;

        super('GrepAgent', prompt, tools);
    }

    async executeTool(name: string, input: any) {
        return mcpManager.executeTool(name, input);
    }
}
