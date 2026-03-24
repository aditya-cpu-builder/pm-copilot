import * as vscode from 'vscode';
import { ChatPanelProvider } from './chat/chatPanel';
import { sessionManager } from './session/sessionManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('[PM Copilot Extension] - Natively Activated');

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        sessionManager.setWorkspaceRoot(workspaceFolders[0].uri.fsPath);
    }

    const provider = new ChatPanelProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatPanelProvider.viewType, provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('pm-copilot.start', () => {
            vscode.commands.executeCommand('workbench.view.extension.pm-copilot-container');
        })
    );
}

export function deactivate() {
    console.log('[PM Copilot Extension] - Natively Deactivated');
}
