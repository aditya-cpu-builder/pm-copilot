import * as fs from 'fs';
import * as path from 'path';
import { SessionState } from './sessionTypes';

export class SessionManager {
    public sessionDir: string;

    constructor() {
        this.sessionDir = path.join(process.cwd(), 'workspace', '.pm-copilot', 'sessions');
        this.ensureDir();
    }

    public setWorkspaceRoot(rootPath: string) {
        this.sessionDir = path.join(rootPath, 'workspace', '.pm-copilot', 'sessions');
        this.ensureDir();
    }

    private ensureDir() {
        if (!fs.existsSync(this.sessionDir)) {
            fs.mkdirSync(this.sessionDir, { recursive: true });
        }
    }

    private getFilePath(sessionName: string): string {
        return path.join(this.sessionDir, `${sessionName}.md`);
    }

    public createSession(slug: string, subdomain: string = 'general'): string {
        const date = new Date().toISOString().split('T')[0];
        const name = `session_${date}_${slug}`;
        const filePath = this.getFilePath(name);

        const state = `# Session: ${name}\nDate: ${date}\nDomain: payments\nSubdomain: ${subdomain}\nStatus: active\n\n## Resources Fetched\n\n## Key Findings\n\n## Last Completed Step\nInitialized session\n\n## Output File\n`;
        fs.writeFileSync(filePath, state, 'utf-8');
        return name;
    }

    public readSession(sessionName: string): string {
        const p = this.getFilePath(sessionName);
        if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
        throw new Error(`Session ${sessionName} not found`);
    }

    public updateSession(sessionName: string, section: string, content: string) {
        const p = this.getFilePath(sessionName);
        if (!fs.existsSync(p)) return;

        let data = fs.readFileSync(p, 'utf-8');
        
        // Replace strategy: find section block and append immediately underneath without wiping future blocks
        const regex = new RegExp(`## ${section}([\\s\\S]*?)(?=## |$)`);
        data = data.replace(regex, `## ${section}$1\n${content}\n`);
        
        fs.writeFileSync(p, data, 'utf-8');
    }

    public setStatus(sessionName: string, status: 'active' | 'completed' | 'crashed') {
        const p = this.getFilePath(sessionName);
        if (!fs.existsSync(p)) return;

        let data = fs.readFileSync(p, 'utf-8');
        data = data.replace(/Status: .*/, `Status: ${status}`);
        fs.writeFileSync(p, data, 'utf-8');
    }

    public updateLastStep(sessionName: string, stepTrace: string) {
        const p = this.getFilePath(sessionName);
        if (!fs.existsSync(p)) return;

        let data = fs.readFileSync(p, 'utf-8');
        data = data.replace(/## Last Completed Step[\s\S]*?(?=## Output File|$)/, `## Last Completed Step\n${stepTrace}\n\n`);
        fs.writeFileSync(p, data, 'utf-8');
    }

    public listSessions(): string[] {
        if (!fs.existsSync(this.sessionDir)) return [];
        return fs.readdirSync(this.sessionDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
    }

    public forkSession(oldSessionName: string, newBranchName: string): string {
        const oldP = this.getFilePath(oldSessionName);
        const newP = this.getFilePath(newBranchName);
        if (!fs.existsSync(oldP)) throw new Error("Source session not found");
        
        fs.copyFileSync(oldP, newP);
        
        let data = fs.readFileSync(newP, 'utf-8');
        data = data.replace(/# Session: .*/, `# Session: ${newBranchName}`);
        fs.writeFileSync(newP, data, 'utf-8');
        
        return newBranchName;
    }

    public clearSessionContext(sessionName: string, summary: string) {
        this.updateSession(sessionName, 'Key Findings', `- [Cleared] Session reset checkpoint. Memory: ${summary}`);
    }
}

export const sessionManager = new SessionManager();
