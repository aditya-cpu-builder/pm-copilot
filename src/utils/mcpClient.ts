import * as fs from 'fs';
import * as path from 'path';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

interface McpServerConfig {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
}

class McpClientManager {
    private clients: Map<string, Client> = new Map();
    private toolRegistries: Map<string, any[]> = new Map(); 
    private originalToolNames: Map<string, string> = new Map();
    private failedServers: Set<string> = new Set();

    constructor() {}

    private resolveEnvValue(v: string): string {
        if (v.startsWith('${') && v.endsWith('}')) {
            return process.env[v.slice(2, -1)] || '';
        }
        return v;
    }

    private buildChildEnv(conf: McpServerConfig): Record<string, string> {
        const env: Record<string, string> = { ...process.env } as Record<string, string>;
        if (conf.env) {
            for (const [k, v] of Object.entries(conf.env)) {
                env[k] = this.resolveEnvValue(v);
            }
        }
        return env;
    }

    public async connectAll() {
        const p = path.join(process.cwd(), '.mcp.json');
        if (!fs.existsSync(p)) return;
        const config = JSON.parse(fs.readFileSync(p, 'utf-8'));
        
        const promises = Object.entries(config.mcpServers || {}).map(
            ([name, conf]) => this.connectServer(name, conf as McpServerConfig)
        );
        await Promise.allSettled(promises);
    }

    private createTransport(serverName: string, conf: McpServerConfig): StdioClientTransport | StreamableHTTPClientTransport | null {
        if (conf.url) {
            const headers: Record<string, string> = {};
            if (conf.headers) {
                for (const [k, v] of Object.entries(conf.headers)) {
                    headers[k] = this.resolveEnvValue(v);
                }
            }
            return new StreamableHTTPClientTransport(
                new URL(conf.url),
                { requestInit: { headers } }
            );
        } else if (conf.command) {
            return new StdioClientTransport({
                command: conf.command,
                args: conf.args || [],
                env: this.buildChildEnv(conf)
            });
        }
        return null;
    }

    private async connectServer(serverName: string, conf: McpServerConfig) {
        // Pre-check: are required env keys set?
        if (conf.env) {
            for (const [, v] of Object.entries(conf.env)) {
                if (v.startsWith('${') && v.endsWith('}')) {
                    const envKey = v.slice(2, -1);
                    if (!process.env[envKey]) {
                        this.failedServers.add(serverName);
                        console.error(`[MCP] ✗ ${serverName}: env var ${envKey} not set`);
                        return;
                    }
                }
            }
        }

        // Retry up to 3 times with 3s delay (helps proxies that need startup time)
        let connectedClient: Client | null = null;
        let toolsList: any = null;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const transport = this.createTransport(serverName, conf);
                if (!transport) {
                    this.failedServers.add(serverName);
                    console.error(`[MCP] ✗ ${serverName}: no 'url' or 'command' specified`);
                    return;
                }

                const client = new Client(
                    { name: `pm-copilot-${serverName}`, version: "2.0.0" },
                    { capabilities: {} }
                );

                const result = await Promise.race([
                    (async () => {
                        await client.connect(transport);
                        return await client.listTools();
                    })(),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Connection timed out after 30s')), 30000)
                    )
                ]);

                connectedClient = client;
                toolsList = result;
                break;
            } catch (e: any) {
                lastError = e;
                if (attempt < 3) {
                    console.log(`[MCP] ↻ ${serverName}: retry ${attempt}/3 in 3s... (${e.message})`);
                    await new Promise(r => setTimeout(r, 3000));
                }
            }
        }

        if (!connectedClient || !toolsList) {
            this.failedServers.add(serverName);
            console.error(`[MCP] ✗ ${serverName}: ${lastError?.message || 'unknown error'}`);
            return;
        }

        this.clients.set(serverName, connectedClient);
        const mappedTools = toolsList.tools.map((t: any) => {
            const mappedName = `${serverName}_${t.name.replace(/[^a-zA-Z0-9_]/g, '_')}`;
            this.originalToolNames.set(mappedName, t.name);
            return {
                name: mappedName,
                description: t.description,
                input_schema: t.inputSchema
            };
        });
        this.toolRegistries.set(serverName, mappedTools);
        console.log(`[MCP] ✓ ${serverName} connected (${mappedTools.length} tools)`);
    }

    public getToolsFor(servers: string[]): any[] {
        let tools: any[] = [];
        for (const s of servers) {
            if (this.toolRegistries.has(s)) {
                tools = tools.concat(this.toolRegistries.get(s)!);
            }
        }
        return tools;
    }

    public getSpecificTools(requestedNames: string[]): any[] {
        const allTools = Array.from(this.toolRegistries.values()).flat();
        return allTools.filter(t => requestedNames.includes(t.name));
    }

    public getConnectionStatus(): { connected: string[]; failed: string[] } {
        return {
            connected: Array.from(this.clients.keys()),
            failed: Array.from(this.failedServers)
        };
    }

    public async executeTool(mappedName: string, args: any): Promise<string> {
        const originalName = this.originalToolNames.get(mappedName);
        if (!originalName) throw new Error(`Tool ${mappedName} not found in dynamic mappings.`);
        
        const serverName = mappedName.split('_')[0];
        const client = this.clients.get(serverName);
        if (!client) throw new Error(`Underlying client disconnected for ${serverName}`);

        try {
            const res = await client.callTool({ name: originalName, arguments: args });
            return JSON.stringify(res.content);
        } catch (e: any) {
            throw new Error(`MCP Tool Error in ${serverName}: ${e.message}`);
        }
    }
}

export const mcpManager = new McpClientManager();
