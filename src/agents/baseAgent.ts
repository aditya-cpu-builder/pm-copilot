import { cerebras } from '../utils/cerebras';
import { toolNameValidator } from '../hooks/toolNameValidator';

export class BaseAgent {
    constructor(public name: string, public systemPrompt: string, public tools: any[]) {
        // Enforce dot-free toolnames explicitly bounded by the EDD config schema requirement
        this.tools.forEach(t => toolNameValidator(t.name));
    }

    async run(messages: any[]): Promise<any> {
        let currentMessages = [...messages];
        
        while (true) {
            const response = await cerebras.messages.create({
                model: 'qwen-3-235b-a22b-instruct-2507',
                max_tokens: 4096,
                system: this.systemPrompt,
                messages: currentMessages,
                tools: this.tools,
                stream: false
            } as any);

            // The official Anthropic interface requires appending the exact generated assistant message block
            currentMessages.push({ role: 'assistant', content: response.content });

            const toolCalls = response.content.filter((b: any) => b.type === 'tool_use');
            if (toolCalls.length === 0) return response;

            const toolResults = [];
            for (const c of toolCalls) {
                const call = c as any;
                try {
                    const res = await this.executeTool(call.name, call.input);
                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: call.id,
                        content: typeof res === 'string' ? res : JSON.stringify(res)
                    });
                } catch (e: any) {
                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: call.id,
                        content: `Error executing tool: ${e.message}`,
                        is_error: true
                    });
                }
            }
            
            // Loop array push mirroring Vercel AI recursive blocks but strictly in Anthropics format
            currentMessages.push({ role: 'user', content: toolResults });
        }
    }

    async executeTool(name: string, input: any): Promise<any> {
        return `Executed ${name}`;
    }
}
