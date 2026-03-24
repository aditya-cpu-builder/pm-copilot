import { CoordinatorAgent } from '../agents/coordinator';
import { sessionManager } from '../session/sessionManager';
import { AppError } from '../utils/errors';

// Conversation history for multi-turn context
const conversationHistory: { role: string; content: string }[] = [];

export async function handleUserMessage(message: string, sessionId: string, onUpdate: (msg: string) => void) {
    onUpdate("Parsing intent...");
    if (message.startsWith('/new-prd ')) {
        const subdomain = message.split(' ')[1] || 'general';
        onUpdate(`Starting PRD generation for ${subdomain}...`);
        const coordinator = new CoordinatorAgent();
        const res = await coordinator.run([{ role: 'user', content: `[SYSTEM: ROUTE_REQUEST] agent="prd_agent", subdomain="${subdomain}", intent="write a PRD"` }]);
        const text = res.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
        onUpdate(`🏁 ${text}`);
        return;
    }
    if (message.startsWith('/new-strategy ')) {
        const subdomain = message.split(' ')[1] || 'general';
        const coordinator = new CoordinatorAgent();
        const res = await coordinator.run([{ role: 'user', content: `[SYSTEM: ROUTE_REQUEST] agent="strategy_agent", subdomain="${subdomain}", intent="write a strategy doc"` }]);
        const text = res.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
        onUpdate(`🏁 ${text}`);
        return;
    }
    if (message.startsWith('/new-design ')) {
        const subdomain = message.split(' ')[1] || 'general';
        const coordinator = new CoordinatorAgent();
        const res = await coordinator.run([{ role: 'user', content: `[SYSTEM: ROUTE_REQUEST] agent="design_agent", subdomain="${subdomain}", intent="create wireframes for ${subdomain}"` }]);
        const text = res.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
        onUpdate(`🏁 ${text}`);
        return;
    }
    if (message === '/clear') {
        conversationHistory.length = 0; // Also clear in-memory history
        sessionManager.clearSessionContext(sessionId, "User invoked /clear manually.");
        onUpdate("Context window cleared and saved to session log.");
        return;
    }
    if (message.startsWith('/init ')) {
        const name = message.split(' ')[1];
        if (name) {
            try {
                const logs = sessionManager.readSession(name);
                onUpdate(`Loaded session ${name}`);
            } catch (e) {
                onUpdate("Session not found");
            }
        }
        return;
    }
    if (message.startsWith('/fork ')) {
        const name = message.split(' ')[1];
        if (name) {
            sessionManager.forkSession(sessionId, name);
            onUpdate(`Forked current state to new generic session branch ${name}`);
        }
        return;
    }
    if (message === '/sessions') {
        const list = sessionManager.listSessions();
        onUpdate(`Available Sessions:\n- ${list.join('\n- ')}`);
        return;
    }
    if (message === '/status') {
        const logs = sessionManager.readSession(sessionId);
        onUpdate(`Current Session File:\n\n${logs}`);
        return;
    }

    try {
        onUpdate("Routing via Coordinator LLM...");
        
        // Add user message to history
        conversationHistory.push({ role: 'user', content: message });
        
        // Keep last 10 turns (20 messages) to prevent context overflow
        while (conversationHistory.length > 20) {
            conversationHistory.shift();
        }

        const coordinator = new CoordinatorAgent();
        const res = await coordinator.run([...conversationHistory]);
        
        let textOutput = '';
        if (res.content && Array.isArray(res.content)) {
            textOutput = res.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
        } else if (res.text) {
             textOutput = res.text; // Generic SDK text fallback
        } else {
             textOutput = JSON.stringify(res);
        }
        
        // Add assistant response to history
        conversationHistory.push({ role: 'assistant', content: textOutput });
        
        onUpdate(`🤖 Copilot: ${textOutput}`);
    } catch (e: any) {
        if (e instanceof AppError) {
            onUpdate(`❌ System Intervention\nConstraint: ${e.category}\nAction: ${e.howToFix}\nError: ${e.message}`);
        } else {
            onUpdate(`❌ Critical Error: ${e.message}`);
        }
    }
}
