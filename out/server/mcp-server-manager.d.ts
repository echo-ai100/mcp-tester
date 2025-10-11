/// <reference types="node" />
import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { ClientRequest, CompatibilityCallToolResult, GetPromptResult, ListPromptsResult, ListResourcesResult, ListResourceTemplatesResult, ListToolsResult, LoggingLevel, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
export interface MCPConfig {
    type: 'stdio' | 'sse' | 'streamable-http';
    command?: string;
    args?: string[];
    url?: string;
    env?: Record<string, string>;
    customHeaders?: Record<string, string>;
    oauthClientId?: string;
    oauthScope?: string;
    name?: string;
}
export interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: any;
    outputSchema?: any;
}
export interface MCPResource {
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
    annotations?: {
        audience?: Array<"assistant" | "human">;
        priority?: number;
    };
}
export interface MCPPrompt {
    name: string;
    description?: string;
    arguments?: Array<{
        name: string;
        description?: string;
        required?: boolean;
    }>;
}
export interface MCPRoot {
    uri: string;
    name?: string;
}
export interface RequestHistoryItem {
    id: string;
    timestamp: Date;
    request: ClientRequest;
    response?: any;
    error?: string;
}
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export interface ServerCapabilities {
    logging?: {
        [key: string]: any;
    };
    prompts?: {
        listChanged?: boolean;
    };
    resources?: {
        subscribe?: boolean;
        listChanged?: boolean;
    };
    tools?: {
        listChanged?: boolean;
    };
    completion?: {
        [key: string]: any;
    };
    experimental?: {
        [key: string]: any;
    };
}
export declare class MCPServerManager extends EventEmitter {
    private _context;
    private _isConnected;
    private _connectionStatus;
    private _config;
    private _client;
    private _transport;
    private _serverCapabilities;
    private _requestHistory;
    private _maxHistorySize;
    private _requestId;
    constructor(_context: vscode.ExtensionContext);
    connect(config: MCPConfig): Promise<void>;
    private _createTransport;
    private _setupEventHandlers;
    get isConnected(): boolean;
    get connectionStatus(): ConnectionStatus;
    get serverCapabilities(): ServerCapabilities | null;
    get requestHistory(): RequestHistoryItem[];
    clearRequestHistory(): void;
    private _makeRequest;
    private _addToHistory;
    startServer(): Promise<void>;
    listTools(cursor?: string): Promise<ListToolsResult>;
    callTool(name: string, parameters: any, progressToken?: number): Promise<CompatibilityCallToolResult>;
    listResources(cursor?: string): Promise<ListResourcesResult>;
    listResourceTemplates(cursor?: string): Promise<ListResourceTemplatesResult>;
    readResource(uri: string): Promise<ReadResourceResult>;
    subscribeToResource(uri: string): Promise<void>;
    unsubscribeFromResource(uri: string): Promise<void>;
    listPrompts(cursor?: string): Promise<ListPromptsResult>;
    getPrompt(name: string, arguments_?: Record<string, string>): Promise<GetPromptResult>;
    setLoggingLevel(level: LoggingLevel): Promise<void>;
    complete(ref: any, argument: {
        name: string;
        value: string;
    }): Promise<any>;
    ping(): Promise<void>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=mcp-server-manager.d.ts.map