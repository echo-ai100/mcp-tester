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

    //打开窗口
    context.subscriptions.push(
        vscode.commands.registerCommand('mcp-tester.open', () => {
            provider.show();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcp-tester.connect', async() => {
            await provider.connectToServer();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcp-tester.listTools', async() => {
            await serverManager.listTools();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mcp-tester.listResources', async() => {
            await serverManager.listResources();
        })
    );

    const config = vscode.workspace.getConfiguration('mcp-tester');
    if(config.get<boolean>('autoStart',true)){
        serverManager.startServer();
    }
}

export function deactivate() {
    console.log('deactivate');
}