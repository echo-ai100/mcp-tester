import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { error } from 'console';

//mcp配置
export interface MCPConfig {
    type: 'stdio' | 'sse' | 'http',
    command?: string,
    url?: string,
    env?: Record<string, string>;
}
//工具
export interface Tool {
    name: string,
    description?: string,
    inputSchema?: any;
}
//资源
export interface Resource {
    url: string
    name?: string,
    description?: string,
    mimeYype?: string;
}

//prompt
export interface Prompt {
    name: string,
    description?: string,
    arguments?: any;
}

export class MCPServerManager extends EventEmitter {
    private _isConnected: boolean = false;
    private _config: MCPConfig | null = null;
    private _client: Client | null = null;
    private _transport: any = null;

    constructor(private _context: vscode.ExtensionContext) {
        super();
    }

    public async connect(config: MCPConfig): Promise<void> {
        try {
            this._config = config;
            switch (config.type) {
                case 'stdio':
                    if (!config.command) {
                        throw new Error('No command specified');
                    }
                    this._transport = new StdioClientTransport({
                        command: config.command,
                        env: { ...Object.fromEntries(Object.entries(process.env).filter(([_, v]) => v !== undefined)), ...config.env } as Record<string, string>
                    });
                    break;
                case 'sse':
                    if (!config.url) {
                        throw new Error('SSE transport requires a url');
                    }
                    this._transport = new SSEClientTransport(new URL(config.url));
                    break;
                case 'http':
                    if (!config.url) {
                        throw new Error('HTTP transport requires a url');
                    }
                    this._transport = new StreamableHTTPClientTransport(new URL(config.url));
                default:
                    throw new Error(`Unknown transport type ${config.type}`);
            }

            this._client = new Client({
                name: 'mcp-tester-vscode',
                version: '1.0.0'
            },{
                capabilities:{}
            });

            //连接到服务器
            const timeout = vscode.workspace.getConfiguration('mcp-tester').get('timeout',30000);
            await Promise.race([
                this._client.connect(this._transport),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
            ]);
            this._isConnected = true;
            this.emit('connected');
            vscode.window.showInformationMessage('Connected to MCP Server');
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to connect to MCP Server:${e}`);
            this._isConnected = false;
            this.emit('error',error);
            throw e;
        }
    }

    //启动服务
    public async startServer(): Promise<void> { 
        vscode.window.showInformationMessage('Starting MCP Server...');
    }

    //列出所有工具
    public async listTools(): Promise<Tool[]> {
        if(!this._client || !this._isConnected){
            throw new Error('MCP Server is not connected');
        }

        try{
            const timeout = vscode.workspace.getConfiguration('mcp-tester').get<number>('timeout',30000);
            const result = await Promise.race([
                this._client.listTools(),
                new Promise((_,reject) => setTimeout(() =>{
                    reject(new Error('list tools request timeout'));
                }))
            ]);
            const typedResult = result as {tools:Tool[]}
            const tools = typedResult.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
            }));
            return tools;
        }catch(e){
            console.error(`list tools failed: ${e}`);
            vscode.window.showErrorMessage(`list tools failed: ${e}`);
            throw e;
        }
    }

    //调用工具
    public async callTool(name: string, parameters: any):Promise<any>{ 
        if(!this._client || !this._isConnected){
            throw new Error('client not connected');
        }
        try{
            const timeout = vscode.workspace.getConfiguration('mcp-tester').get('timeout',30000);
            const result = await Promise.race([
                this._client.callTool({name,arguments:parameters}),
                new Promise((_,reject)=> setTimeout(()=>reject(new Error('timeout')),timeout))
            ])

            return result
        }catch(e){
            const errorMsg = e instanceof Error ? e.message : String(e)
            const userFriendlyError = new Error(`Error calling tool ${name}: ${errorMsg}`)
            vscode.window.showErrorMessage(userFriendlyError.message)
            throw userFriendlyError
        }
    }

    //列出所有资源
    public async listResources(): Promise<Resource[]> {
        if(!this._client || !this._isConnected){
            throw new Error('client not connected');
        }
        try{
            const timeout = vscode.workspace.getConfiguration('mcp-tester').get('timeout',30000);
            const result = await Promise.race([
                this._client.listResources(),
                new Promise((_,reject)=> setTimeout(()=>reject(new Error('timeout')),timeout))
            ])
            const typedResult = result as {resources:Resource[]}
            return typedResult.resources;
        }catch(e){
            const errorMsg = e instanceof Error ? e.message : String(e)
            const userFriendlyError = new Error(`Error listing resources: ${errorMsg}`)
            vscode.window.showErrorMessage(userFriendlyError.message)
            throw userFriendlyError
        }
    }

    //列出所有提示词
    public async listPrompts(): Promise<Prompt[]> {
        if(!this._client || !this._isConnected){
            throw new Error('client not connected');
        }
        try{
            const timeout = vscode.workspace.getConfiguration('mcp-tester').get('timeout',30000);
            const result = await Promise.race([
                this._client.listPrompts(),
                new Promise((_,reject)=> setTimeout(()=>reject(new Error('timeout')),timeout))
            ])
            const typedResult = result as {prompts:Prompt[]}
            return typedResult.prompts;
        }catch(e){
            const errorMsg = e instanceof Error ? e.message : String(e)
            const userFriendlyError = new Error(`Error listing prompts: ${errorMsg}`)
            vscode.window.showErrorMessage(userFriendlyError.message)
            throw userFriendlyError
        }
    }

    public async readResource(uri: string): Promise<any> {
        if(!this._client || !this._isConnected){
            throw new Error('client not connected');
        }
        try{
            const timeout = vscode.workspace.getConfiguration('mcp-tester').get('timeout',30000);
            const result = await Promise.race([
                this._client.readResource({uri}),
                new Promise((_,reject)=> setTimeout(()=>reject(new Error('timeout')),timeout))
            ]);

            return result as any
        }catch(e){
            const errorMsg = e instanceof Error ? e.message : String(e)
            const userFriendlyError = new Error(`Error reading resource ${uri}: ${errorMsg}`)
            vscode.window.showErrorMessage(userFriendlyError.message)
            throw userFriendlyError
        }
    }

    public async ping(): Promise<void> {
        if(!this._client || !this._isConnected){
            throw new Error('client not connected');
        }
        try{
            const timeout = vscode.workspace.getConfiguration('mcp-tester').get('timeout',30000);
            await Promise.race([
                this._client.ping(),
                new Promise((_,reject)=> setTimeout(()=>reject(new Error('timeout')),timeout))
            ])
        }catch(e){
            const errorMsg = e instanceof Error ? e.message : String(e)
            const userFriendlyError = new Error(`Error pinging MCP Server: ${errorMsg}`)
            vscode.window.showErrorMessage(userFriendlyError.message)
            throw userFriendlyError
        }
    }

    public get isConnected(): boolean {
        return this._isConnected;
    }

    //断开连接
    public async disconnect(): Promise<void> {
       try{
        if(this._client){
            await this._client.close();
        }

        if(this._transport){
            try{
                await this._transport.close();
            }catch(e){
                console.error(`Error closing transport: ${e}`);

            }
        }
       }catch(error){
        console.error(`Error disconnecting from MCP Server: ${error}`);
        this.emit('error',error)
       }finally{
        this._isConnected = false;
        this._client = null;
        this._transport = null;
        this._config = null;
        this.emit('disconnected')
        vscode.window.showInformationMessage('Disconnected from MCP Server');
       }
    }
}
