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
                
                try{
                    switch (data.type) {
                        case 'connect':
                            await this._serverManager.connect(data.config);
                            break;
                        case 'disconnect':
                            await this._serverManager.disconnect();
                            break;
                        case 'startServer':
                            await this._serverManager.startServer();
                            break;
                        case 'listTools':
                            const tools = await this._serverManager.listTools();
                    }
                }catch(error){

                    const errorMsg = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(errorMsg);

                    this._view?.webview.postMessage({
                        type: 'error',
                        error: errorMsg,
                        timestamp:new Date().toISOString()
                    });
                }
            },
            undefined,
            this._context.subscriptions
        );

    }

    //获取工具列表
    private async _handleListTools(webview?:vscode.Webview){
        try{
            const tools = await this._serverManager.listTools();
            const targetWebview = webview || this._view?.webview;
            if(targetWebview){
                targetWebview.postMessage({
                    type: 'list-tools',
                    tools
                });

            }
        }catch(error){
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to list tools:${errorMsg}`);
        }
    }

    //获取提示词列表
    private async _handleListPrompts(){
        try{
            const prompts = await this._serverManager.listPrompts();
            if(this._toolsPanel && this._toolsPanel.webview){
                this._toolsPanel.webview.postMessage({
                    type: 'prompts-list',
                    prompts
                });
            }
        }catch(error){
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to list prompts`)
        }
    }

    //获取资源列表
    private async _handleListResources(){
        try{
            const resources = await this._serverManager.listResources();
            if(this._toolsPanel && this._toolsPanel.webview){
                this._toolsPanel.webview.postMessage({
                    type: 'list-resources',
                    resources
                });
            }
        }catch(error){
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to list resources:${errorMsg}`);
        }
    }

    //读取资源
    private async _handleReadResource(uri:string){
        try{
            const content = await this._serverManager.readResource(uri);
            if(this._toolsPanel && this._toolsPanel.webview){
                this._toolsPanel.webview.postMessage({
                    type: 'read-resource-result',
                    content
                });
            }
        }catch(error){
            const errorMsg = error instanceof Error ? error.message : String(error);
        }
    }

    //调用工具
    private async _handleCallTool(toolName:string,parameters:any){
        try{
            const result = await this._serverManager.callTool(toolName,parameters);
            if(this._toolsPanel && this._toolsPanel.webview){
                this._toolsPanel.webview.postMessage({
                    type: 'call-tool',
                    result
                });
            }
        }catch(error){
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to call tool:${errorMsg}`);
        }
    }

    //处理连接
    private async _handleConnect(config:any){
        try{
            const configuration = vscode.workspace.getConfiguration('mcp-tester');
            const servers = configuration.get<any[]>('servers')||[];

            const serverConfig = {
                name: config.name || `MCP Server ${servers.length + 1}`,
                type: config.type,
                command: config.command,
                url: config.url,
                env: config.env
            }

            const existingIndex = servers.findIndex(server => server.name === serverConfig.name || 
                (server.type === serverConfig.type && server.url === serverConfig.url && server.command === serverConfig.command));

            if(existingIndex >= 0){
                servers[existingIndex] = serverConfig;
            }else{
                servers.push(serverConfig);
            }

            await configuration.update('servers', servers, vscode.ConfigurationTarget.Global);
            await this._serverManager.connect(config)

            await this._handleGetStatus();
            await this._handleOpenToolsPanel();

            vscode.window.showInformationMessage(`Connected to ${serverConfig.name}`);
        }catch(error){
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to connect:${errorMsg}`);
        }
    }

    //获取连接状态
    private async _handleGetStatus(){ 
        const isConnected = this._serverManager.isConnected;
        const capabilities = isConnected ? {tools:true,prompts:true,resources:true} : {};
        const configuration = vscode.workspace.getConfiguration('mcp-tester');
        const servers = configuration.get<any[]>('servers')||[];
        this._view?.webview.postMessage({
            type: 'connection-status',
            status:isConnected? 'connected':'disconnected',
            capabilities,
            savedServers:servers
        });
    }

    private async _handleOpenToolsPanel(){
        try{
            if(!this._toolsPanel){
                this._toolsPanel = vscode.window.createWebviewPanel(
                    'mcpToolsPanel',
                    'MCP Tools',
                    vscode.ViewColumn.One,

                    {
                        enableScripts: true,
                        localResourceRoots: [
                            this._context.extensionUri,
                            vscode.Uri.joinPath(this._context.extensionUri, 'webview-dist')
                        ]
                    }
                )
            }

        }
    }

    private _getToolsPanelHtml(webview: vscode.Webview){
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