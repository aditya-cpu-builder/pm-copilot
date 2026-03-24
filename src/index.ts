import * as readline from 'readline/promises';
import { handleUserMessage } from './chat/commandHandler';
import { sessionManager } from './session/sessionManager';
import { mcpManager } from './utils/mcpClient';

async function run() {
    console.log('\n🤖 PM Copilot V2 (Claude SDK + HydraProxy) Online. Type "exit" to quit.\n');
    console.log('Mounting internal MCP background servers...');
    await mcpManager.connectAll();
    console.log('MCP Mounts Complete.\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const sessionId = sessionManager.createSession('terminal_run');
    console.log(`Logging session to: workspace/.pm-copilot/sessions/${sessionId}.md\n`);

    while (true) {
        const query = await rl.question('\x1b[36mPM> \x1b[0m');
        if (query.trim().toLowerCase() === 'exit') break;
        if (!query.trim()) continue;

        try {
            await handleUserMessage(query, sessionId, (msg) => {
                // Color code the Copilot explicit returns
                if (msg.startsWith('🤖 Copilot:')) {
                    console.log(`\n\x1b[32m💬 Copilot:\x1b[0m ${msg.replace('🤖 Copilot:', '')}\n`);
                } else if (msg.startsWith('❌')) {
                    console.log(`\n\x1b[31m${msg}\x1b[0m\n`);
                } else {
                    console.log(`  ${msg}`);
                }
            });
        } catch (e: any) {
            console.log(`\n\x1b[31m❌ Fatal Error: ${e.message}\x1b[0m\n`);
        }
    }

    rl.close();
}

run();
