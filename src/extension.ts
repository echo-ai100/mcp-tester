import * as vscode from 'vscode';
import {MCPTesterProvider} from './mcp-tester-provider';
import {MCPServerManager} from './server/mcp-server-manager';

export function activate(context: vscode.ExtensionContext) {
    const serverManager = new MCPServerManager(context);
    const provider = new MCPTesterProvider(context, serverManager);

    // 注册webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MCPTesterProvider.viewType, provider)
    );

    // 注册命令
    const commands = [
        // 基础命令
        vscode.commands.registerCommand('mcp-tester.open', () => {
            // 如果已连接，直接打开ToolPanels；否则显示侧边栏
            if (serverManager.isConnected) {
                provider.openToolsPanel();
            } else {
                provider.show();
            }
        }),
        
        vscode.commands.registerCommand('mcp-tester.connect', async () => {
            await provider.connectToServer();
            // 连接成功后自动打开ToolPanels
            if (serverManager.isConnected) {
                setTimeout(() => {
                    provider.openToolsPanel();
                }, 500);
            }
        }),
        
        // 工具相关命令
        vscode.commands.registerCommand('mcp-tester.listTools', async () => {
            try {
                const result = await serverManager.listTools();
                const items = result.tools.map(tool => ({
                    label: tool.name,
                    description: tool.description,
                    detail: `输入: ${tool.inputSchema ? 'JSON对象' : '无'}`,
                    tool
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: '选择要查看的工具'
                });
                
                if (selected) {
                    const jsonString = JSON.stringify(selected.tool, null, 2);
                    const doc = await vscode.workspace.openTextDocument({
                        content: jsonString,
                        language: 'json'
                    });
                    await vscode.window.showTextDocument(doc);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`获取工具列表失败: ${error}`);
            }
        }),
        
        // 资源相关命令
        vscode.commands.registerCommand('mcp-tester.listResources', async () => {
            try {
                const result = await serverManager.listResources();
                const items = result.resources.map(resource => ({
                    label: resource.name || resource.uri,
                    description: resource.description,
                    detail: resource.uri,
                    resource
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: '选择要读取的资源'
                });
                
                if (selected) {
                    const content = await serverManager.readResource(selected.resource.uri);
                    const doc = await vscode.workspace.openTextDocument({
                        content: JSON.stringify(content, null, 2),
                        language: 'json'
                    });
                    await vscode.window.showTextDocument(doc);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`获取资源列表失败: ${error}`);
            }
        }),
        
        // 提示词相关命令
        vscode.commands.registerCommand('mcp-tester.listPrompts', async () => {
            try {
                const result = await serverManager.listPrompts();
                const items = result.prompts.map(prompt => ({
                    label: prompt.name,
                    description: prompt.description,
                    detail: `参数: ${prompt.arguments?.length || 0}个`,
                    prompt
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: '选择要查看的提示词'
                });
                
                if (selected) {
                    const jsonString = JSON.stringify(selected.prompt, null, 2);
                    const doc = await vscode.workspace.openTextDocument({
                        content: jsonString,
                        language: 'json'
                    });
                    await vscode.window.showTextDocument(doc);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`获取提示词列表失败: ${error}`);
            }
        }),
        
        // Ping 命令
        vscode.commands.registerCommand('mcp-tester.ping', async () => {
            try {
                await serverManager.ping();
                vscode.window.showInformationMessage('Ping 成功！服务器响应正常。');
            } catch (error) {
                vscode.window.showErrorMessage(`Ping 失败: ${error}`);
            }
        }),
        
        // 断开连接命令
        vscode.commands.registerCommand('mcp-tester.disconnect', async () => {
            try {
                await serverManager.disconnect();
                vscode.window.showInformationMessage('已断开连接');
            } catch (error) {
                vscode.window.showErrorMessage(`断开连接失败: ${error}`);
            }
        }),
        
        // 查看连接状态
        vscode.commands.registerCommand('mcp-tester.status', () => {
            const status = serverManager.connectionStatus;
            const capabilities = serverManager.serverCapabilities;
            
            let message = `连接状态: ${status}`;
            if (capabilities) {
                message += `\n服务器能力: ${Object.keys(capabilities).join(', ')}`;
            }
            
            vscode.window.showInformationMessage(message);
        }),
        
        // 清除历史记录
        vscode.commands.registerCommand('mcp-tester.clearHistory', () => {
            serverManager.clearRequestHistory();
            vscode.window.showInformationMessage('请求历史记录已清除');
        }),
        
        // 导出配置
        vscode.commands.registerCommand('mcp-tester.exportConfig', async () => {
            try {
                const config = vscode.workspace.getConfiguration('mcp-tester');
                const servers = config.get('servers', []);
                
                const exportData = {
                    mcpServers: servers.reduce((acc: any, server: any) => {
                        acc[server.name] = {
                            type: server.type,
                            command: server.command,
                            args: server.args,
                            url: server.url,
                            env: server.env
                        };
                        return acc;
                    }, {})
                };
                
                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file('mcp-servers.json'),
                    filters: {
                        'JSON Files': ['json']
                    }
                });
                
                if (uri) {
                    const content = JSON.stringify(exportData, null, 2);
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                    vscode.window.showInformationMessage(`配置已导出到 ${uri.fsPath}`);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`导出配置失败: ${error}`);
            }
        }),
        
        // 导入配置
        vscode.commands.registerCommand('mcp-tester.importConfig', async () => {
            try {
                const uris = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: {
                        'JSON Files': ['json']
                    }
                });
                
                if (uris && uris[0]) {
                    const content = await vscode.workspace.fs.readFile(uris[0]);
                    const configData = JSON.parse(content.toString());
                    
                    if (configData.mcpServers) {
                        const config = vscode.workspace.getConfiguration('mcp-tester');
                        const currentServers = config.get('servers', []);
                        
                        const newServers = Object.entries(configData.mcpServers).map(([name, serverConfig]: [string, any]) => ({
                            name,
                            ...serverConfig
                        }));
                        
                        const mergedServers = [...currentServers, ...newServers];
                        await config.update('servers', mergedServers, vscode.ConfigurationTarget.Global);
                        
                        vscode.window.showInformationMessage(`成功导入 ${newServers.length} 个服务器配置`);
                    } else {
                        vscode.window.showErrorMessage('配置文件格式错误');
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`导入配置失败: ${error}`);
            }
        })
    ];

    context.subscriptions.push(...commands);

    // 自动启动
    const config = vscode.workspace.getConfiguration('mcp-tester');
    if (config.get<boolean>('autoStart', true)) {
        // 自动显示面板，但不自动连接
        provider.show();
    }
    
    // 状态栏项
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(debug-disconnect) MCP: 未连接';
    statusBarItem.command = 'mcp-tester.open'; // 点击状态栏执行打开命令
    statusBarItem.tooltip = '点击打开 MCP Tester';
    statusBarItem.show();
    
    // 监听连接状态变化更新状态栏
    serverManager.on('connectionStatusChanged', (status: string) => {
        switch (status) {
            case 'connected':
                statusBarItem.text = '$(debug-connect) MCP: 已连接';
                statusBarItem.color = undefined;
                statusBarItem.tooltip = '点击打开 MCP Tools Panel';
                break;
            case 'connecting':
                statusBarItem.text = '$(loading~spin) MCP: 连接中';
                statusBarItem.color = 'yellow';
                statusBarItem.tooltip = 'MCP 连接中...';
                break;
            case 'error':
                statusBarItem.text = '$(error) MCP: 错误';
                statusBarItem.color = 'red';
                statusBarItem.tooltip = '点击查看 MCP 错误信息';
                break;
            default:
                statusBarItem.text = '$(debug-disconnect) MCP: 未连接';
                statusBarItem.color = undefined;
                statusBarItem.tooltip = '点击打开 MCP Tester';
        }
    });
    
    context.subscriptions.push(statusBarItem);
}

export function deactivate() {
    console.log('MCP Tester deactivated');
}