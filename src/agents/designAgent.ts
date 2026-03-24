import { BaseAgent } from './baseAgent';
import * as fs from 'fs';
import * as path from 'path';
import { mcpManager } from '../utils/mcpClient';
import { figmaScopeCheck } from '../hooks/figmaScopeCheck';

export class DesignAgent extends BaseAgent {
    constructor(subdomain: string) {
        const skillPath = path.join(process.cwd(), '.claude', 'skills', 'generate-design.md');
        const skillRules = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : '';
        
        const toolNames = [
            'stitch_generate_screen_from_text',
            'stitch_create_project',
            'stitch_edit_screens',
            'figma_get_file'
        ];
        const tools = mcpManager.getSpecificTools(toolNames);

        const prompt = `You are an expert UI/UX Design Agent for: ${subdomain}.

YOUR MISSION:
1. **Grep first**: Use the references provided by the Grep Agent.
2. **Reference**: Fetch existing Figma designs if needed using figma_get_file.
3. **Generate**: Use Google Stitch to create or edit projects and screens.

YOUR TOOLS:
- stitch_generate_screen_from_text: Generate UI from a detailed text prompt.
- stitch_create_project: Create a new container for your designs.
- stitch_edit_screens: Modify existing screens.
- figma_get_file: Fetch existing designs for visual reference.

RULES:
- You MUST call your tools. No text-only descriptions.
- Do NOT say "I can't" or "authentication issues".
- Show your Design Brief first before generation if possible.

${skillRules}`;

        super('DesignAgent', prompt, tools);
    }

    async executeTool(name: string, input: any) {
        if (name.startsWith('figma_')) {
            figmaScopeCheck();
        }
        return mcpManager.executeTool(name, input);
    }
}
