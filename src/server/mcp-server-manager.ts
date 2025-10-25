import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
    ClientRequest,
    CompatibilityCallToolResult,
    CreateMessageRequest,
    CreateMessageResult,
    GetPromptResult,
    ListPromptsResult,
    ListResourcesResult,
    ListResourceTemplatesResult,
    ListRootsResult,
    ListToolsResult,
    LoggingLevel,
    PromptMessage,
    ReadResourceResult,
    ServerNotification,
    SamplingMessage,
    CallToolRequest,
    SetLevelRequest
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

//mcp配置
export interface MCPConfig {
    type: 'stdio' | 'sse' | 'streamable-http',
    command?: string,
    args?: string[],
    url?: string,
    env?: Record<string, string>;
    customHeaders?: Record<string, string>;
    oauthClientId?: string;
    oauthScope?: string;
    name?: string;
}

//工具
export interface MCPTool {
    name: string,
    description?: string,
    inputSchema?: any;
    outputSchema?: any;
}

//资源
export interface MCPResource {
    uri: string
    name?: string,
    description?: string,
    mimeType?: string;
    annotations?: {
        audience?: Array<"assistant" | "human">;
        priority?: number;
    };
}

//prompt
export interface MCPPrompt {
    name: string,
    description?: string,
    arguments?: Array<{
        name: string;
        description?: string;
        required?: boolean;
    }>;
}

//根目录
export interface MCPRoot {
    uri: string;
    name?: string;
}

//请求历史
export interface RequestHistoryItem {
    id: string;
    timestamp: Date;
    request: ClientRequest;
    response?: any;
    error?: string;
}

//连接状态
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

//服务器能力
export interface ServerCapabilities {
    logging?: { [key: string]: any };
    prompts?: { listChanged?: boolean };
    resources?: { subscribe?: boolean; listChanged?: boolean };
    tools?: { listChanged?: boolean };
    completion?: { [key: string]: any };
    experimental?: { [key: string]: any };
}

export class MCPServerManager extends EventEmitter {
    private _isConnected: boolean = false;
    private _connectionStatus: ConnectionStatus = 'disconnected';
    private _config: MCPConfig | null = null;
    private _client: Client | null = null;
    private _transport: any = null;
    private _serverCapabilities: ServerCapabilities | null = null;
    private _requestHistory: RequestHistoryItem[] = [];
    private _maxHistorySize = 100;
    private _requestId = 0;

    constructor(private _context: vscode.ExtensionContext) {
        super();
        this._maxHistorySize = vscode.workspace.getConfiguration('mcp-tester').get('maxHistory', 100);
    }

    public async connect(config: MCPConfig): Promise<void> {
        try {
            this._connectionStatus = 'connecting';
            this.emit('connectionStatusChanged', this._connectionStatus);
            
            this._config = config;
            
            // 创建传输层
            await this._createTransport(config);
            
            // 创建客户端
            this._client = new Client({
                name: 'mcp-tester-vscode',
                version: '1.0.0'
            }, {
                capabilities: {
                    completion: {},
                    experimental: {}
                }
            });

            // 设置事件监听器
            this._setupEventHandlers();

            // 连接到服务器
            const timeout = vscode.workspace.getConfiguration('mcp-tester').get('timeout', 30000);
            await Promise.race([
                this._client.connect(this._transport),
                new Promise((_, reject) => setTimeout(() => reject(new Error('连接超时')), timeout))
            ]);
            
            // 获取服务器能力
            // const result = await this._client.listCapabilities();
            // this._serverCapabilities = result.capabilities;
            this._serverCapabilities = {}; // 暂时使用空对象
            
            this._isConnected = true;
            this._connectionStatus = 'connected';
            this.emit('connected');
            this.emit('connectionStatusChanged', this._connectionStatus);
            
            vscode.window.showInformationMessage('已连接到 MCP 服务器');
        } catch (e) {
            this._connectionStatus = 'error';
            this.emit('connectionStatusChanged', this._connectionStatus);
            vscode.window.showErrorMessage(`连接 MCP 服务器失败: ${e}`);
            this._isConnected = false;
            this.emit('error', e);
            throw e;
        }
    }

    private async _createTransport(config: MCPConfig): Promise<void> {
        switch (config.type) {
            case 'stdio':
                if (!config.command) {
                    throw new Error('STDIO 传输需要指定命令');
                }
                
                this._transport = new StdioClientTransport({
                    command: config.command,
                    args: config.args || [],
                    env: { 
                        ...Object.fromEntries(Object.entries(process.env).filter(([_, v]) => v !== undefined)), 
                        ...config.env 
                    } as Record<string, string>
                });
                break;
                
            case 'sse':
                if (!config.url) {
                    throw new Error('SSE 传输需要指定 URL');
                }
                
                const sseHeaders: Record<string, string> = {
                    'Accept': 'text/event-stream',
                    ...config.customHeaders
                };
                
                this._transport = new SSEClientTransport(new URL(config.url));
                // Note: 忽略headers配置，因为当前SDK不支持
                break;
                
            case 'streamable-http':
                if (!config.url) {
                    throw new Error('Streamable HTTP 传输需要指定 URL');
                }
                
                const httpHeaders: Record<string, string> = {
                    'Accept': 'text/event-stream, application/json',
                    ...config.customHeaders
                };
                
                this._transport = new StreamableHTTPClientTransport(new URL(config.url));
                // Note: 忽略headers配置，因为当前SDK不支持
                break;
                
            default:
                throw new Error(`未知的传输类型: ${config.type}`);
        }
    }

    private _setupEventHandlers(): void {
        if (!this._client) return;
        
        // 监听服务器通知
        // this._client.onNotification = (notification: ServerNotification) => {
        //     this.emit('notification', notification);
        // };
        
        // 监听采样请求
        // this._client.onRequest = async (request: any) => {
        //     if (request.method === 'sampling/createMessage') {
        //         return new Promise((resolve, reject) => {
        //             this.emit('samplingRequest', request, resolve, reject);
        //         });
        //     }
        //     
        //     // 其他请求类型
        //     return null;
        // };
    }

    public get isConnected(): boolean {
        return this._isConnected;
    }

    public get connectionStatus(): ConnectionStatus {
        return this._connectionStatus;
    }
    
    public get serverCapabilities(): ServerCapabilities | null {
        return this._serverCapabilities;
    }
    
    public get requestHistory(): RequestHistoryItem[] {
        return this._requestHistory;
    }
    
    public clearRequestHistory(): void {
        this._requestHistory = [];
    }

    // 发送请求的通用方法
    // 使用一个宽松的schema来避免SDK内部的parse错误
    private async _makeRequest<T>(request: ClientRequest, schema?: any): Promise<T> {
        if (!this._client || !this._isConnected) {
            throw new Error('客户端未连接');
        }
        
        const requestId = `req_${this._requestId++}`;
        const historyItem: RequestHistoryItem = {
            id: requestId,
            timestamp: new Date(),
            request
        };
        
        try {
            // 创建一个宽松的passthrough schema，接受任何对象
            const passthroughSchema = z.object({}).passthrough();
            
            // 使用SDK的request方法，但传入宽松的schema
            const response = await this._client.request(request, passthroughSchema) as T;
            
            historyItem.response = response;
            this._addToHistory(historyItem);
            
            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            historyItem.error = errorMessage;
            this._addToHistory(historyItem);
            throw error;
        }
    }
    
    private _addToHistory(item: RequestHistoryItem): void {
        this._requestHistory.unshift(item);
        if (this._requestHistory.length > this._maxHistorySize) {
            this._requestHistory = this._requestHistory.slice(0, this._maxHistorySize);
        }
        this.emit('historyUpdated', this._requestHistory);
    }

    //启动服务
    public async startServer(): Promise<void> { 
        vscode.window.showInformationMessage('Starting MCP Server...');
    }

    //列出所有工具
    public async listTools(cursor?: string): Promise<ListToolsResult> {
        if (!this._client || !this._isConnected) {
            throw new Error('客户端未连接');
        }
        
        const request: ClientRequest = {
            method: "tools/list" as const,
            params: cursor ? { cursor } : {}
        };
        
        const result = await this._makeRequest<ListToolsResult>(request);
        
        // 确保返回的数据结构正确
        return {
            tools: result?.tools || [],
            nextCursor: result?.nextCursor
        };
    }

    //调用工具
    public async callTool(name: string, parameters: any, progressToken?: number): Promise<CompatibilityCallToolResult> {
        const request: CallToolRequest = {
            method: "tools/call" as const,
            params: {
                name,
                arguments: parameters,
                _meta: progressToken ? { progressToken } : undefined
            }
        };
        
        return this._makeRequest(request);
    }

    //列出所有资源
    public async listResources(cursor?: string): Promise<ListResourcesResult> {
        if (!this._client || !this._isConnected) {
            throw new Error('客户端未连接');
        }
        
        const request: ClientRequest = {
            method: "resources/list" as const,
            params: cursor ? { cursor } : {}
        };
        
        const result = await this._makeRequest<ListResourcesResult>(request);
        
        return {
            resources: result?.resources || [],
            nextCursor: result?.nextCursor
        };
    }
    
    //列出资源模板
    public async listResourceTemplates(cursor?: string): Promise<ListResourceTemplatesResult> {
        if (!this._client || !this._isConnected) {
            throw new Error('客户端未连接');
        }
        
        const request: ClientRequest = {
            method: "resources/templates/list" as const,
            params: cursor ? { cursor } : {}
        };
        
        const result = await this._makeRequest<ListResourceTemplatesResult>(request);
        
        return {
            resourceTemplates: result?.resourceTemplates || [],
            nextCursor: result?.nextCursor
        };
    }
    
    //读取资源
    public async readResource(uri: string): Promise<ReadResourceResult> {
        const request: ClientRequest = {
            method: "resources/read" as const,
            params: { uri }
        };
        
        return this._makeRequest(request);
    }
    
    //订阅资源
    public async subscribeToResource(uri: string): Promise<void> {
        const request: ClientRequest = {
            method: "resources/subscribe" as const,
            params: { uri }
        };
        
        await this._makeRequest(request);
    }
    
    //取消订阅资源
    public async unsubscribeFromResource(uri: string): Promise<void> {
        const request: ClientRequest = {
            method: "resources/unsubscribe" as const,
            params: { uri }
        };
        
        await this._makeRequest(request);
    }

    //列出所有提示词
    public async listPrompts(cursor?: string): Promise<ListPromptsResult> {
        if (!this._client || !this._isConnected) {
            throw new Error('客户端未连接');
        }
        
        const request: ClientRequest = {
            method: "prompts/list" as const,
            params: cursor ? { cursor } : {}
        };
        
        const result = await this._makeRequest<ListPromptsResult>(request);
        
        return {
            prompts: result?.prompts || [],
            nextCursor: result?.nextCursor
        };
    }
    
    //获取提示词
    public async getPrompt(name: string, arguments_: Record<string, string> = {}): Promise<GetPromptResult> {
        // 检查参数对象是否为空，如果为空则不包含arguments字段
        // 这符合MCP协议规范：无参数时应省略arguments字段
        const hasValidArguments = arguments_ && Object.keys(arguments_).length > 0;
        
        const request: ClientRequest = {
            method: "prompts/get" as const,
            params: hasValidArguments 
                ? { name, arguments: arguments_ }
                : { name }
        };
        
        return this._makeRequest(request);
    }

    //列出根目录
    // public async listRoots(): Promise<ListRootsResult> {
    //     const request: ClientRequest = {
    //         method: "roots/list" as const,
    //         params: {}
    //     };
    //     
    //     return this._makeRequest(request);
    // }
    
    //发送通知
    // public async sendNotification(notification: any): Promise<void> {
    //     if (!this._client || !this._isConnected) {
    //         throw new Error('客户端未连接');
    //     }
    //     
    //     await this._client.sendNotification(notification);
    // }
    
    //设置日志级别
    public async setLoggingLevel(level: LoggingLevel): Promise<void> {
        const request: SetLevelRequest = {
            method: "logging/setLevel" as const,
            params: { level }
        };
        
        await this._makeRequest(request);
    }
    
    //完成请求
    public async complete(ref: any, argument: { name: string; value: string }): Promise<any> {
        const request: ClientRequest = {
            method: "completion/complete" as const,
            params: {
                ref,
                argument
            }
        };
        
        return this._makeRequest(request);
    }

    public async ping(): Promise<void> {
        const request: ClientRequest = {
            method: "ping" as const,
            params: {}
        };
        
        await this._makeRequest(request);
    }

    //断开连接
    public async disconnect(): Promise<void> {
        try {
            this._connectionStatus = 'disconnected';
            
            if (this._client) {
                await this._client.close();
            }

            if (this._transport) {
                try {
                    await this._transport.close();
                } catch (e) {
                    console.error(`关闭传输层时出错: ${e}`);
                }
            }
        } catch (error) {
            console.error(`断开 MCP 服务器连接时出错: ${error}`);
            this.emit('error', error);
        } finally {
            this._isConnected = false;
            this._client = null;
            this._transport = null;
            this._config = null;
            this._serverCapabilities = null;
            this.emit('disconnected');
            this.emit('connectionStatusChanged', this._connectionStatus);
            vscode.window.showInformationMessage('已断开与 MCP 服务器的连接');
        }
    }
}