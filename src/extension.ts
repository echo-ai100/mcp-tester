import * as vscode from 'vscode';
import {MCPTesterProvider} from './mcp-tester-provider';
import {MCPServerManager} from './server/mcp-server-manager';

export function activate(context: vscode.ExtensionContext) {
    const serverManager = new MCPServerManager(context);
    const provider = new MCPTesterProvider(context,serverManager);

    //注册webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MCPTesterProvider.viewType, provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcp-tester.open', () => {
            provider.show();
        })
    );
}