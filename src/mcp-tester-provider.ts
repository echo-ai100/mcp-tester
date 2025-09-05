import * as vscode from 'vscode';
import { MCPServerManager } from './server/mcp-server-manager';
import { time, timeStamp } from 'console';

export class MCPTesterProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'mcpTester';
    private _view?: vscode.WebviewView;
    private _toolsPanel?: vscode.WebviewPanel;

    constructor(private readonly _context: vscode.ExtensionContext,
        private readonly _serverManager: MCPServerManager
    ) { }

    public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {

        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [
                this._context.extensionUri,
                vscode.Uri.joinPath(this._context.extensionUri, 'webview-dist')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (data) => {

                try {
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
                        default:
                            console.error(`Unhandled message type: ${data.type}`);
                    }
                } catch (error) {

                    const errorMsg = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(errorMsg);

                    this._view?.webview.postMessage({
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

    public show() {
        if(this._view){
            this._view.show?.(true)
        }else{
            vscode.commands.executeCommand('mcp-explorer.focus');
        }
    }

    public async connectToServer(){
        const config = await this._promptForMCPConfig();
        if(config){
            await this._handleConnect(config);
        }
    }

    private async _promptForMCPConfig(){
        const transportType = await vscode.window.showQuickPick(['stdio', 'sse', 'streamable-http'],{placeHolder:'Select transport type'});
        if (!transportType) {
            return;
        }
        switch(transportType){
            case 'stdio':
                const command = await vscode.window.showInputBox({
                    placeHolder: 'Enter command',
                    prompt: 'Enter command to run MCP server'
                });
                if(!command){
                    return null;
                }

                let config:any = {type:'stdio',command};
                const envInput = await vscode.window.showInputBox({
                    placeHolder: '{param1:value1,param2:value2}',
                    prompt: 'Enter environment variables'
                });

                if(envInput){
                    try {
                        const env = JSON.parse(envInput);
                        config.env = env;
                    } catch (error) {
                        vscode.window.showErrorMessage(`Invalid environment variables:${error}`);
                    }
                }

                return config;
            case 'sse':
                const sseUrl = await vscode.window.showInputBox({
                    placeHolder: 'http://example.com/sse',
                    prompt: 'Enter SSE URL'
                });
                return sseUrl ? {type:'sse',sseUrl} : null;

            case 'streamable-http':
                const url = await vscode.window.showInputBox({
                    placeHolder: 'http://example.com/http',
                    prompt: 'Enter HTTP URL'
                });
                return url ? {type:'streamable-http',url} : null;
            default:
                return null;
        }
    }

    //获取提示词列表
    private async _handleListPrompts() {
        try {
            const prompts = await this._serverManager.listPrompts();
            if (this._toolsPanel && this._toolsPanel.webview) {
                this._toolsPanel.webview.postMessage({
                    type: 'prompts-list',
                    prompts
                });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to list prompts`)
        }
    }

    //获取资源列表
    private async _handleListResources() {
        try {
            const resources = await this._serverManager.listResources();
            if (this._toolsPanel && this._toolsPanel.webview) {
                this._toolsPanel.webview.postMessage({
                    type: 'list-resources',
                    resources
                });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to list resources:${errorMsg}`);
        }
    }

    //读取资源
    private async _handleReadResource(uri: string) {
        try {
            const content = await this._serverManager.readResource(uri);
            if (this._toolsPanel && this._toolsPanel.webview) {
                this._toolsPanel.webview.postMessage({
                    type: 'read-resource-result',
                    content
                });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
        }
    }

    //获取工具列表
    private async _handleListTools(webview?: vscode.Webview) {
        try {
            const tools = await this._serverManager.listTools();
            const targetWebview = webview || this._view?.webview;
            if (targetWebview) {
                targetWebview.postMessage({
                    type: 'list-tools',
                    tools
                });

            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to list tools:${errorMsg}`);
        }
    }
    //调用工具
    private async _handleCallTool(toolName: string, parameters: any) {
        try {
            const result = await this._serverManager.callTool(toolName, parameters);
            if (this._toolsPanel && this._toolsPanel.webview) {
                this._toolsPanel.webview.postMessage({
                    type: 'call-tool',
                    result
                });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to call tool:${errorMsg}`);
        }
    }

    //处理连接
    private async _handleConnect(config: any) {
        try {
            const configuration = vscode.workspace.getConfiguration('mcp-tester');
            const servers = configuration.get<any[]>('servers') || [];

            const serverConfig = {
                name: config.name || `MCP Server ${servers.length + 1}`,
                type: config.type,
                command: config.command,
                url: config.url,
                env: config.env
            }

            const existingIndex = servers.findIndex(server => server.name === serverConfig.name ||
                (server.type === serverConfig.type && server.url === serverConfig.url && server.command === serverConfig.command));

            if (existingIndex >= 0) {
                servers[existingIndex] = serverConfig;
            } else {
                servers.push(serverConfig);
            }

            await configuration.update('servers', servers, vscode.ConfigurationTarget.Global);
            await this._serverManager.connect(config)

            await this._handleGetStatus();
            await this._handleOpenToolsPanel();

            vscode.window.showInformationMessage(`Connected to ${serverConfig.name}`);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to connect:${errorMsg}`);
        }
    }

    private async _handleDisconnect() {
        try {
            await this._serverManager.disconnect();
            this._view?.webview.postMessage({
                type: 'connection-status',
                status: 'disconnected',
                capablilities: {}
            });
            vscode.window.showInformationMessage('Disconnected from MCP Server');
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to disconnect:${errorMsg}`);
        }
    }

    //ping  
    private async _handlePing() {
        try {
            if (this._toolsPanel && this._toolsPanel.webview) {
                if (this._serverManager.isConnected) {
                    const result = await this._serverManager.ping();
                    this._toolsPanel.webview.postMessage({
                        type: 'console-output',
                        output: `Ping result: ${result}`
                    });

                }
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (this._toolsPanel && this._toolsPanel.webview) {
                this._toolsPanel.webview.postMessage({
                    type: 'console-output',
                    output: errorMsg
                });
            }
        }
    }

    //删除服务器
    private async _handleDeleteServer(name: string) {
        try {
            const answer = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: `Are you sure you want to delete ${name}?`
            });

            if (answer === 'Yes') {
                const configuration = vscode.workspace.getConfiguration('mcp-tester');
                const servers = configuration.get<any[]>('servers') || [];
                const updatedServers = servers.filter(server => server.name !== name);
                await configuration.update('servers', updatedServers, vscode.ConfigurationTarget.Global);
                await this._handleGetStatus();
                vscode.window.showInformationMessage(`Deleted ${name}`);
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to delete server:${errorMsg}`);
        }
    }

    private async _handleLoadServer(name: string) {
        try {
            const configuration = vscode.workspace.getConfiguration('mcp-tester');
            const servers = configuration.get<any[]>('servers') || [];
            const server = servers.find(server => server.name === name);
            if (!server) {
                vscode.window.showErrorMessage(`Server ${name} not found`);
                return;
            }

            this._view?.webview.postMessage({
                type: 'load-config',
                config: server
            });

            vscode.window.showInformationMessage(`Loaded ${name}`);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to load server:${errorMsg}`);

        }
    }

    //获取连接状态
    private async _handleGetStatus() {
        const isConnected = this._serverManager.isConnected;
        const capabilities = isConnected ? { tools: true, prompts: true, resources: true } : {};
        const configuration = vscode.workspace.getConfiguration('mcp-tester');
        const servers = configuration.get<any[]>('servers') || [];
        this._view?.webview.postMessage({
            type: 'connection-status',
            status: isConnected ? 'connected' : 'disconnected',
            capabilities,
            savedServers: servers
        });
    }

    private async _handleOpenToolsPanel() {
        try {

            const panel = vscode.window.createWebviewPanel(
                'mcpToolsPanel',
                'MCP-Tester',
                vscode.ViewColumn.One,

                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        this._context.extensionUri,
                        vscode.Uri.joinPath(this._context.extensionUri, 'webview-dist')
                    ]
                }
            );

            panel.onDidDispose(() => {
                this._toolsPanel = undefined;
            },null, this._context.subscriptions);
            //加载HTML及切换视图
            const html = this._getToolsPanelHtml(panel.webview);
            panel.webview.html = html;
            this._toolsPanel = panel;

            panel.webview.onDidReceiveMessage(async (message) => { 
                console.log(`received message:${message}`);

                try{
                    switch (message.type) {

                        case 'webview-ready':
                            const isConnected = this._serverManager.isConnected;
                            const capabilities = isConnected ? { tools: true, prompts: true, resources: true } : {};
                            const configuration = vscode.workspace.getConfiguration('mcp-tester');
                            const servers = configuration.get<any[]>('servers') || [];
                            panel.webview.postMessage({
                                type: 'connection-status',
                                status: isConnected ? 'connected' : 'disconnected',
                                capabilities,
                                savedServers: servers
                            });

                            if(isConnected){
                                await this._handleListTools(panel.webview);
                            }
                            break;
                        case 'call-tool':
                            await this._handleCallTool(message.name, message.parameters);
                            break;

                        case 'list-resources':
                            await this._handleListResources();
                            break;
                        case 'read-resource':
                            await this._handleReadResource(message.uri);
                            break;
                        case 'list-prompts':
                            await this._handleListPrompts();
                            break;
                        case 'ping-server':
                            await this._handlePing();
                            break;
                        default:
                            console.error(`unknown message type:${message.type}`);
                            break;
                    }
                }catch(error){
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error(errorMsg);
                }
            });


        }catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to open tools panel:${errorMsg}`);
        }
    }

    private _getToolsPanelHtml(webview: vscode.Webview) {
        const vueDistUri = vscode.Uri.joinPath(this._context.extensionUri, 'webview-dist');
        const mainJs = webview.asWebviewUri(vscode.Uri.joinPath(vueDistUri, 'assets', 'main.js'));
        const mainCss = webview.asWebviewUri(vscode.Uri.joinPath(vueDistUri, 'assets', 'main.css'));
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview}/>
            <title>MCP Tools</title>
            <link href="${mainCss}" rel="stylesheet"></link>
        </head>
        <body>
            <div id="app" data-view="tools-panel"></div>
            <script type="module" src="${mainJs}"></script>
        </body>
        </html>`
    }
    private _getHtmlForWebview(webview: vscode.Webview) {
        const vueDistUri = vscode.Uri.joinPath(this._context.extensionUri, 'webview-dist');
        const mainJs = webview.asWebviewUri(vscode.Uri.joinPath(vueDistUri, 'assets', 'main.js'));
        const mainCss = webview.asWebviewUri(vscode.Uri.joinPath(vueDistUri, 'assets', 'main.css'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};img-src ${webview.cspSource} data:"></meta>
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