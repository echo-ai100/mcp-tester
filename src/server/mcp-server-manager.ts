import {EventEmitter} from 'events';
import * as vscode from 'vscode';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {SSEClientTransport} from '@modelcontextprotocol/sdk/client/sse.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

//mcp配置
export interface MCPConfig{
    type: 'stdio' | 'sse' | 'http',
    command?: string,
    url?: string,
    env?: Record<string, string>;
}
//工具
export interface Tool{
    name:string,
    description?:string,
    inputSchema?:any;
}
//资源
export interface Resource{
    url:string
    name?:string,
    description?:string,
    mimeYype?:string;
}

//prompt
export interface Prompt{
    name:string,
    description?:string,
    arguments?:any;
}

export class MCPServerManager extends EventEmitter{ 
    private _isConnected:boolean = false;
    private _config:MCPConfig | null = null;
    private _client:Client | null = null;
    private _transport:any = null;

    constructor(private _context:vscode.ExtensionContext){
        super();
    }

    public async connect(config:MCPConfig):Promise<boolean>{ 
        try{
            this._config = config;
            switch(config.type){
                case 'stdio':
                    if(!config.command){
                        throw new Error('No command specified');
                    }
                    this._transport = new StdioClientTransport({
                        command: config.command,
                        env: {...Object.fromEntries(Object.entries(process.env).filter(([_,v])=>v!==undefined)),...config.env} as Record<string,string>
                    });
                    break

            }
        }catch(e){
            console.log(e);
            throw e;
        }
    }
}
