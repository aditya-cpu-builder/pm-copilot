import * as vscode from 'vscode';
import { handleUserMessage } from './commandHandler';
import { sessionManager } from '../session/sessionManager';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'pm-copilot.chatView';
    private _view?: vscode.WebviewView;
    private currentSessionId: string;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.currentSessionId = sessionManager.createSession('default');
    }

    public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            if (data.type === 'chat') {
                this.updateConsole(`You: ${data.value}`);
                try {
                    await handleUserMessage(data.value, this.currentSessionId, (msg) => {
                        this.updateConsole(msg);
                    });
                } catch (e: any) {
                    this.updateConsole(`❌ Error: ${e.message}`);
                }
            }
        });
    }

    private updateConsole(message: string) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'addMessage', value: message });
        }
    }

    private getHtmlForWebview() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 10px; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
                    #chat { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
                    .msg { padding: 8px; border-radius: 4px; background: var(--vscode-editor-inactiveSelectionBackground); white-space: pre-wrap; word-wrap: break-word; }
                    input { padding: 12px; border-radius: 4px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); outline: none; }
                </style>
            </head>
            <body>
                <div id="chat">
                    <div class="msg"><b>🤖 PM Copilot Framework Online.</b> Type a prompt or /slash command to interact.</div>
                </div>
                <input id="input" type="text" placeholder="Route a prompt or slash command..." />
                <script>
                    const vscode = acquireVsCodeApi();
                    const input = document.getElementById('input');
                    const chat = document.getElementById('chat');

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'addMessage') {
                            const div = document.createElement('div');
                            div.className = 'msg';
                            div.textContent = message.value;
                            chat.appendChild(div);
                            chat.scrollTop = chat.scrollHeight;
                        }
                    });

                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter' && input.value.trim() !== '') {
                            vscode.postMessage({ type: 'chat', value: input.value });
                            input.value = '';
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
