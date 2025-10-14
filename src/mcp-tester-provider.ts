import * as vscode from 'vscode';
import { MCPServerManager, MCPConfig, RequestHistoryItem, ConnectionStatus, ServerCapabilities } from './server/mcp-server-manager';

export class MCPTesterProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'mcp-tester';
    private _view?: vscode.WebviewView;
    private _toolsPanel?: vscode.WebviewPanel;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _serverManager: MCPServerManager
    ) { 
        // 监听服务器管理器事件
        this._setupServerManagerListeners();
    }

    private _setupServerManagerListeners(): void {
        this._serverManager.on('connected', () => {
            this._sendToWebview({ type: 'connection-status', status: 'connected' });
        });

        this._serverManager.on('disconnected', () => {
            this._sendToWebview({ type: 'connection-status', status: 'disconnected' });
        });

        this._serverManager.on('error', (error: Error) => {
            this._sendToWebview({ 
                type: 'error', 
                error: error.message, 
                timestamp: new Date().toISOString() 
            });
        });

        this._serverManager.on('connectionStatusChanged', (status: ConnectionStatus) => {
            this._sendToWebview({ 
                type: 'connection-status', 
                status,
                capabilities: this._serverManager.serverCapabilities || {}
            });
        });

        this._serverManager.on('notification', (notification: any) => {
            this._sendToWebview({ 
                type: 'notification', 
                notification,
                timestamp: new Date().toISOString()
            });
        });

        this._serverManager.on('samplingRequest', (request: any, resolve: Function, reject: Function) => {
            this._sendToWebview({ 
                type: 'sampling-request', 
                request,
                timestamp: new Date().toISOString()
            });
            // 临时存储resolve/reject以便后续响应
            // 这里需要实现请求ID管理机制
        });

        this._serverManager.on('historyUpdated', (history: RequestHistoryItem[]) => {
            this._sendToWebview({ 
                type: 'history-updated', 
                history: history.slice(0, 10) // 只发送最近10条
            });
        });
    }

    private _sendToWebview(message: any): void {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
        if (this._toolsPanel) {
            this._toolsPanel.webview.postMessage(message);
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView, 
        context: vscode.WebviewViewResolveContext, 
        token: vscode.CancellationToken
    ): Thenable<void> | void {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._context.extensionUri,
                vscode.Uri.joinPath(this._context.extensionUri, 'src', 'webview-dist')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (data) => {
                try {
                    await this._handleMessage(data);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(errorMsg);
                    this._sendToWebview({
                        type: 'error',
                        error: errorMsg,
                        timestamp: new Date().toISOString()
                    });
                }
            },
            undefined,
            this._context.subscriptions
        );
    }

    private async _handleMessage(data: any): Promise<void> {
        switch (data.type) {
            case 'connect':
                await this._handleConnect(data.config);
                break;
            case 'disconnect':
                await this._handleDisconnect();
                break;
            case 'get-status':
                await this._handleGetStatus();
                break;
            case 'delete-server':
                await this._handleDeleteServer(data.name);
                break;
            case 'load-server':
                await this._handleLoadServer(data.name);
                break;
            case 'open-tools-panel':
                this._handleOpenToolsPanel();
                break;
            case 'list-tools':
                await this._handleListTools(data.cursor);
                break;
            case 'call-tool':
                await this._handleCallTool(data.name, data.parameters, data.progressToken);
                break;
            case 'list-resources':
                await this._handleListResources(data.cursor);
                break;
            case 'list-resource-templates':
                await this._handleListResourceTemplates(data.cursor);
                break;
            case 'read-resource':
                await this._handleReadResource(data.uri);
                break;
            case 'subscribe-resource':
                await this._handleSubscribeResource(data.uri);
                break;
            case 'unsubscribe-resource':
                await this._handleUnsubscribeResource(data.uri);
                break;
            case 'list-prompts':
                await this._handleListPrompts(data.cursor);
                break;
            case 'get-prompt':
                await this._handleGetPrompt(data.name, data.arguments);
                break;
            case 'list-roots':
                await this._handleListRoots();
                break;
            case 'ping-server':
                await this._handlePing();
                break;
            case 'set-logging-level':
                await this._handleSetLoggingLevel(data.level);
                break;
            case 'complete':
                await this._handleComplete(data.ref, data.argument);
                break;
            case 'clear-history':
                this._handleClearHistory();
                break;
            case 'export-history':
                await this._handleExportHistory();
                break;
            case 'approve-sampling':
                await this._handleApproveSampling(data.id, data.result);
                break;
            case 'reject-sampling':
                await this._handleRejectSampling(data.id);
                break;
            default:
                console.error(`未处理的消息类型: ${data.type}`);
        }
    }

    public show(): void {
        if (this._view) {
            this._view.show?.(true);
        } else {
            vscode.commands.executeCommand('mcp-tester.focus');
        }
    }

    public openToolsPanel(): void {
        this._handleOpenToolsPanel();
    }

    public async connectToServer(): Promise<void> {
        const config = await this._promptForMCPConfig();
        if (config) {
            await this._handleConnect(config);
        }
    }

    private async _promptForMCPConfig(): Promise<MCPConfig | null> {
        const transportType = await vscode.window.showQuickPick(
            ['stdio', 'sse', 'streamable-http'], 
            { placeHolder: '选择传输类型' }
        );
        
        if (!transportType) {
            return null;
        }

        switch (transportType) {
            case 'stdio':
                return await this._promptForStdioConfig();
            case 'sse':
                return await this._promptForSseConfig();
            case 'streamable-http':
                return await this._promptForHttpConfig();
            default:
                return null;
        }
    }

    private async _promptForStdioConfig(): Promise<MCPConfig | null> {
        const command = await vscode.window.showInputBox({
            placeHolder: '输入命令',
            prompt: '输入运行 MCP 服务器的命令'
        });
        
        if (!command) {
            return null;
        }

        let config: MCPConfig = { type: 'stdio', command };

        const argsInput = await vscode.window.showInputBox({
            placeHolder: 'arg1 arg2 arg3',
            prompt: '输入命令参数（可选）'
        });

        if (argsInput) {
            config.args = argsInput.trim().split(/\s+/);
        }

        const envInput = await vscode.window.showInputBox({
            placeHolder: '{"param1":"value1","param2":"value2"}',
            prompt: '输入环境变量（JSON格式，可选）'
        });

        if (envInput) {
            try {
                config.env = JSON.parse(envInput);
            } catch (error) {
                vscode.window.showErrorMessage(`环境变量格式错误: ${error}`);
            }
        }

        return config;
    }

    private async _promptForSseConfig(): Promise<MCPConfig | null> {
        const url = await vscode.window.showInputBox({
            placeHolder: 'http://example.com/sse',
            prompt: '输入 SSE URL'
        });
        
        return url ? { type: 'sse', url } : null;
    }

    private async _promptForHttpConfig(): Promise<MCPConfig | null> {
        const url = await vscode.window.showInputBox({
            placeHolder: 'http://example.com/mcp',
            prompt: '输入 HTTP URL'
        });
        
        return url ? { type: 'streamable-http', url } : null;
    }

    // 处理连接
    private async _handleConnect(config: MCPConfig): Promise<void> {
        try {
            const configuration = vscode.workspace.getConfiguration('mcp-tester');
            const servers = configuration.get<any[]>('servers') || [];

            const serverConfig = {
                name: config.name || `MCP Server ${servers.length + 1}`,
                type: config.type,
                command: config.command,
                args: config.args,
                url: config.url,
                env: config.env,
                customHeaders: config.customHeaders
            };

            const existingIndex = servers.findIndex(server => 
                server.name === serverConfig.name ||
                (server.type === serverConfig.type && 
                 server.url === serverConfig.url && 
                 server.command === serverConfig.command)
            );

            if (existingIndex >= 0) {
                servers[existingIndex] = serverConfig;
            } else {
                servers.push(serverConfig);
            }

            await configuration.update('servers', servers, vscode.ConfigurationTarget.Global);
            await this._serverManager.connect(config);

            await this._handleGetStatus();
            
            // 连接成功后自动打开ToolPanels
            setTimeout(() => {
                this._handleOpenToolsPanel();
            }, 500); // 延迟500ms确保连接状态稳定

            vscode.window.showInformationMessage(`已连接到 ${serverConfig.name}`);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`连接失败: ${errorMsg}`);
        }
    }

    private async _handleDisconnect(): Promise<void> {
        try {
            await this._serverManager.disconnect();
            this._sendToWebview({
                type: 'connection-status',
                status: 'disconnected',
                capabilities: {}
            });
            vscode.window.showInformationMessage('已断开与 MCP 服务器的连接');
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`断开连接失败: ${errorMsg}`);
        }
    }

    private async _handleGetStatus(): Promise<void> {
        const isConnected = this._serverManager.isConnected;
        const capabilities = this._serverManager.serverCapabilities || {};
        const configuration = vscode.workspace.getConfiguration('mcp-tester');
        const servers = configuration.get<any[]>('servers') || [];
        
        this._sendToWebview({
            type: 'connection-status',
            status: isConnected ? 'connected' : 'disconnected',
            capabilities,
            savedServers: servers
        });
    }

    private async _handleDeleteServer(name: string): Promise<void> {
        try {
            const answer = await vscode.window.showQuickPick(['是', '否'], {
                placeHolder: `确定要删除 ${name} 吗？`
            });

            if (answer === '是') {
                const configuration = vscode.workspace.getConfiguration('mcp-tester');
                const servers = configuration.get<any[]>('servers') || [];
                const updatedServers = servers.filter(server => server.name !== name);
                await configuration.update('servers', updatedServers, vscode.ConfigurationTarget.Global);
                await this._handleGetStatus();
                vscode.window.showInformationMessage(`已删除 ${name}`);
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`删除服务器失败: ${errorMsg}`);
        }
    }

    private async _handleLoadServer(name: string): Promise<void> {
        try {
            const configuration = vscode.workspace.getConfiguration('mcp-tester');
            const servers = configuration.get<any[]>('servers') || [];
            const server = servers.find(server => server.name === name);
            
            if (!server) {
                vscode.window.showErrorMessage(`服务器 ${name} 未找到`);
                return;
            }

            this._sendToWebview({
                type: 'load-config',
                config: server
            });

            // 如果不是当前连接的服务器，则自动连接并打开ToolPanels
            if (!this._serverManager.isConnected) {
                await this._handleConnect(server);
            } else {
                // 如果已连接，则直接打开ToolPanels
                this._handleOpenToolsPanel();
            }

            vscode.window.showInformationMessage(`已加载 ${name}`);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`加载服务器失败: ${errorMsg}`);
        }
    }

    private async _handleListTools(cursor?: string): Promise<void> {
        try {
            if (!this._serverManager.isConnected) {
                throw new Error('未连接到MCP服务器');
            }
            const result = await this._serverManager.listTools(cursor);
            this._sendToWebview({
                type: 'tools-list',
                tools: result?.tools || [],
                nextCursor: result?.nextCursor
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('获取工具列表失败:', errorMsg);
            vscode.window.showErrorMessage(`获取工具列表失败: ${errorMsg}`);
            this._sendToWebview({
                type: 'tools-list',
                tools: [],
                error: errorMsg
            });
        }
    }

    private async _handleCallTool(name: string, parameters: any, progressToken?: number): Promise<void> {
        try {
            const result = await this._serverManager.callTool(name, parameters, progressToken);
            this._sendToWebview({
                type: 'tool-result',
                toolName: name,
                result
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`调用工具失败: ${errorMsg}`);
            this._sendToWebview({
                type: 'tool-error',
                toolName: name,
                error: errorMsg
            });
        }
    }

    private async _handleListResources(cursor?: string): Promise<void> {
        try {
            if (!this._serverManager.isConnected) {
                throw new Error('未连接到MCP服务器');
            }
            const result = await this._serverManager.listResources(cursor);
            this._sendToWebview({
                type: 'resources-list',
                resources: result?.resources || [],
                nextCursor: result?.nextCursor
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('获取资源列表失败:', errorMsg);
            vscode.window.showErrorMessage(`获取资源列表失败: ${errorMsg}`);
            this._sendToWebview({
                type: 'resources-list',
                resources: [],
                error: errorMsg
            });
        }
    }

    private async _handleListResourceTemplates(cursor?: string): Promise<void> {
        try {
            if (!this._serverManager.isConnected) {
                throw new Error('未连接到MCP服务器');
            }
            const result = await this._serverManager.listResourceTemplates(cursor);
            this._sendToWebview({
                type: 'resource-templates-list',
                resourceTemplates: result?.resourceTemplates || [],
                nextCursor: result?.nextCursor
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('获取资源模板列表失败:', errorMsg);
            vscode.window.showErrorMessage(`获取资源模板列表失败: ${errorMsg}`);
            this._sendToWebview({
                type: 'resource-templates-list',
                resourceTemplates: [],
                error: errorMsg
            });
        }
    }

    private async _handleReadResource(uri: string): Promise<void> {
        try {
            const result = await this._serverManager.readResource(uri);
            this._sendToWebview({
                type: 'resource-content',
                uri,
                content: result
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`读取资源失败: ${errorMsg}`);
        }
    }

    private async _handleSubscribeResource(uri: string): Promise<void> {
        try {
            await this._serverManager.subscribeToResource(uri);
            this._sendToWebview({
                type: 'resource-subscribed',
                uri
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`订阅资源失败: ${errorMsg}`);
        }
    }

    private async _handleUnsubscribeResource(uri: string): Promise<void> {
        try {
            await this._serverManager.unsubscribeFromResource(uri);
            this._sendToWebview({
                type: 'resource-unsubscribed',
                uri
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`取消订阅资源失败: ${errorMsg}`);
        }
    }

    private async _handleListPrompts(cursor?: string): Promise<void> {
        try {
            if (!this._serverManager.isConnected) {
                throw new Error('未连接到MCP服务器');
            }
            const result = await this._serverManager.listPrompts(cursor);
            this._sendToWebview({
                type: 'prompts-list',
                prompts: result?.prompts || [],
                nextCursor: result?.nextCursor
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('获取提示词列表失败:', errorMsg);
            vscode.window.showErrorMessage(`获取提示词列表失败: ${errorMsg}`);
            this._sendToWebview({
                type: 'prompts-list',
                prompts: [],
                error: errorMsg
            });
        }
    }

    private async _handleGetPrompt(name: string, arguments_: Record<string, string>): Promise<void> {
        try {
            const result = await this._serverManager.getPrompt(name, arguments_);
            this._sendToWebview({
                type: 'prompt-content',
                name,
                content: result
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`获取提示词失败: ${errorMsg}`);
        }
    }

    private async _handleListRoots(): Promise<void> {
        try {
            // const result = await this._serverManager.listRoots();
            this._sendToWebview({
                type: 'roots-list',
                roots: [] // 暂时返回空数组
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`获取根目录列表失败: ${errorMsg}`);
        }
    }

    private async _handlePing(): Promise<void> {
        try {
            await this._serverManager.ping();
            this._sendToWebview({
                type: 'ping-result',
                success: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this._sendToWebview({
                type: 'ping-result',
                success: false,
                error: errorMsg,
                timestamp: new Date().toISOString()
            });
        }
    }

    private async _handleSetLoggingLevel(level: string): Promise<void> {
        try {
            await this._serverManager.setLoggingLevel(level as any);
            this._sendToWebview({
                type: 'logging-level-set',
                level
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`设置日志级别失败: ${errorMsg}`);
        }
    }

    private async _handleComplete(ref: any, argument: { name: string; value: string }): Promise<void> {
        try {
            const result = await this._serverManager.complete(ref, argument);
            this._sendToWebview({
                type: 'completion-result',
                result
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`完成请求失败: ${errorMsg}`);
        }
    }

    private _handleClearHistory(): void {
        this._serverManager.clearRequestHistory();
        this._sendToWebview({
            type: 'history-cleared'
        });
    }

    private async _handleExportHistory(): Promise<void> {
        try {
            const history = this._serverManager.requestHistory;
            const historyJson = JSON.stringify(history, null, 2);
            
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('mcp-request-history.json'),
                filters: {
                    'JSON Files': ['json']
                }
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(historyJson, 'utf8'));
                vscode.window.showInformationMessage(`历史记录已导出到 ${uri.fsPath}`);
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`导出历史记录失败: ${errorMsg}`);
        }
    }

    private async _handleApproveSampling(id: string, result: any): Promise<void> {
        // 实现采样批准逻辑
        this._sendToWebview({
            type: 'sampling-approved',
            id,
            result
        });
    }

    private async _handleRejectSampling(id: string): Promise<void> {
        // 实现采样拒绝逻辑
        this._sendToWebview({
            type: 'sampling-rejected',
            id
        });
    }

    private async _handleOpenToolsPanel(): Promise<void> {
        try {
            // 如果已经有打开的面板，就显示它
            if (this._toolsPanel) {
                this._toolsPanel.reveal(vscode.ViewColumn.One);
                return;
            }

            const panel = vscode.window.createWebviewPanel(
                'mcpToolsPanel',
                'MCP Tools Panel',
                vscode.ViewColumn.One, // 确保在主区域显示
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        this._context.extensionUri,
                        vscode.Uri.joinPath(this._context.extensionUri, 'src', 'webview-dist')
                    ]
                }
            );

            panel.onDidDispose(() => {
                this._toolsPanel = undefined;
            }, null, this._context.subscriptions);

            const html = this._getToolsPanelHtml(panel.webview);
            panel.webview.html = html;
            this._toolsPanel = panel;

            panel.webview.onDidReceiveMessage(async (message) => {
                try {
                    await this._handleMessage(message);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error(errorMsg);
                }
            });

            // 发送初始状态
            setTimeout(() => {
                this._handleGetStatus();
                if (this._serverManager.isConnected) {
                    this._handleListTools();
                    this._handleListResources();
                    this._handleListPrompts();
                }
            }, 100);

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`打开工具面板失败: ${errorMsg}`);
        }
    }

    private _getToolsPanelHtml(webview: vscode.Webview): string {
        const vueDistUri = vscode.Uri.joinPath(this._context.extensionUri, 'src', 'webview-dist');
        const mainJs = webview.asWebviewUri(vscode.Uri.joinPath(vueDistUri, 'assets', 'main.js'));
        const mainCss = webview.asWebviewUri(vscode.Uri.joinPath(vueDistUri, 'assets', 'main.css'));
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
            <title>MCP Tools</title>
            <link href="${mainCss}" rel="stylesheet">
        </head>
        <body>
            <div id="app" data-view="tools-panel"></div>
            <script type="module" src="${mainJs}"></script>
        </body>
        </html>`;
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const vueDistUri = vscode.Uri.joinPath(this._context.extensionUri, 'src', 'webview-dist');
        const mainJs = webview.asWebviewUri(vscode.Uri.joinPath(vueDistUri, 'assets', 'main.js'));
        const mainCss = webview.asWebviewUri(vscode.Uri.joinPath(vueDistUri, 'assets', 'main.css'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
            <title>MCP Tester</title>
            <link href="${mainCss}" rel="stylesheet">
        </head>
        <body>
            <div id="app"></div>
            <script type="module" src="${mainJs}"></script>
        </body>
        </html>`;
    }
}