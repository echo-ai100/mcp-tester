# MCP Tester

一个功能完整的 VSCode 扩展，用于测试和调试 Model Context Protocol (MCP) 服务器。该扩展提供了与官方 MCP Inspector 相同的功能特性，支持多种传输协议，提供直观的界面进行 MCP 服务器管理和交互。

## 🚀 核心功能

### 📡 多协议支持
- **STDIO 传输**: 支持本地命令行 MCP 服务器
- **SSE (Server-Sent Events)**: 支持基于 HTTP 流式事件的连接
- **Streamable HTTP**: 支持 HTTP 流式传输协议
- **自定义 Headers**: 支持认证和自定义 HTTP 头

### 🛠️ 完整的 MCP 功能
- **工具管理**: 列出、查看和调用 MCP 工具
- **资源管理**: 浏览、读取和订阅 MCP 资源
- **提示词管理**: 管理和使用 MCP 提示词模板
- **根目录管理**: 查看和管理服务器根目录
- **实时通知**: 接收服务器通知和状态更新

### 🎯 高级特性
- **可视化界面**: 基于 Vue.js 的现代化 WebView 界面
- **配置管理**: 保存和管理多个服务器配置
- **请求历史**: 完整的请求/响应历史记录
- **错误处理**: 完善的错误处理和用户反馈
- **状态监控**: 实时连接状态和服务器能力显示
- **采样支持**: 支持 MCP 采样请求和响应
- **完成支持**: 支持参数自动完成

### 🔧 开发者工具
- **命令面板集成**: 所有功能可通过 VSCode 命令面板访问
- **状态栏显示**: 实时显示连接状态
- **配置导入/导出**: 支持 MCP 服务器配置的导入导出
- **日志管理**: 支持设置日志级别和查看日志
- **Ping 测试**: 测试服务器连接和响应

## 📦 安装

### 从源码构建

1. **克隆仓库**:
```bash
git clone <repository-url>
cd mcp-tester
```

2. **安装主项目依赖**:
```bash
npm install
```

3. **安装 Vue webview 依赖**:
```bash
npm run install-webview
```

4. **构建项目**:
```bash
npm run build
```

5. **在 VSCode 中调试**:
   - 按 `F5` 启动调试模式
   - 或者使用 VSCode 的 "Run Extension" 配置

## 🎮 使用方法

### 1. 启动 MCP Tester

#### 通过命令面板:
- 打开命令面板 (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- 输入 "MCP: Open MCP Tester"

#### 通过活动栏:
- 点击左侧活动栏中的 MCP Tester 图标

#### 通过状态栏:
- 点击底部状态栏的 MCP 连接状态

### 2. 连接到 MCP 服务器

#### STDIO 传输 (推荐用于本地开发)
适用于本地命令行 MCP 服务器:

```json
{
  "type": "stdio",
  "command": "node",
  "args": ["path/to/your/mcp-server.js"],
  "env": {
    "API_KEY": "your-api-key",
    "DEBUG": "true"
  }
}
```

**示例配置**:
```json
{
  "type": "stdio",
  "command": "npx",
  "args": ["@modelcontextprotocol/server-everything"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

#### SSE (Server-Sent Events) 传输
适用于 HTTP 流式传输:

```json
{
  "type": "sse",
  "url": "http://localhost:3000/sse",
  "customHeaders": {
    "Authorization": "Bearer your-token",
    "X-API-Key": "your-api-key"
  }
}
```

#### Streamable HTTP 传输
适用于 HTTP 流式传输:

```json
{
  "type": "streamable-http",
  "url": "http://localhost:3000/mcp",
  "customHeaders": {
    "Authorization": "Bearer your-token"
  }
}
```

### 3. 使用 MCP 功能

连接成功后，你可以:

#### 🛠️ 工具 (Tools)
- **列出工具**: 查看服务器提供的所有工具
- **查看工具详情**: 查看工具的输入/输出模式
- **调用工具**: 使用表单或 JSON 格式调用工具
- **查看结果**: 查看工具执行结果和错误信息

#### 📄 资源 (Resources)
- **浏览资源**: 查看可用的资源列表
- **读取资源**: 获取资源内容
- **订阅资源**: 订阅资源变更通知
- **资源模板**: 使用参数化资源模板

#### 💬 提示词 (Prompts)
- **管理提示词**: 查看和使用预定义提示词
- **参数填充**: 为提示词提供参数
- **获取结果**: 获取生成的提示词内容

#### 📁 根目录 (Roots)
- **查看根目录**: 列出服务器根目录
- **目录管理**: 管理服务器文件系统访问

#### 🔔 实时功能
- **服务器通知**: 接收实时服务器通知
- **连接状态**: 监控连接状态变化
- **请求历史**: 查看完整的请求/响应历史

## ⚙️ 配置选项

### VSCode 设置

在 VSCode 设置中配置 `mcp-tester` 相关选项:

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `mcp-tester.autoStart` | boolean | true | VSCode 启动时自动启动 |
| `mcp-tester.defaultTransport` | string | "stdio" | 默认传输协议 |
| `mcp-tester.timeout` | number | 30000 | 请求超时时间(毫秒) |
| `mcp-tester.maxHistory` | number | 100 | 最大历史记录数 |
| `mcp-tester.enableLogging` | boolean | false | 是否启用日志 |
| `mcp-tester.maxRetryAttempts` | number | 3 | 最大重试次数 |
| `mcp-tester.retryDelay` | number | 1000 | 重试延迟(毫秒) |

### 服务器配置

在设置中配置 `mcp-tester.servers` 数组来预定义服务器:

```json
{
  "mcp-tester.servers": [
    {
      "name": "Everything Server",
      "type": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-everything"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Remote API Server",
      "type": "sse",
      "url": "https://api.example.com/mcp/sse",
      "customHeaders": {
        "Authorization": "Bearer your-token"
      }
    },
    {
      "name": "Local HTTP Server",
      "type": "streamable-http",
      "url": "http://localhost:8080/mcp"
    }
  ]
}
```

## 🎛️ 命令面板命令

| 命令 | 描述 |
|------|------|
| `MCP: Open MCP Tester` | 打开 MCP Tester 主界面 |
| `MCP: Connect to MCP Server` | 连接到 MCP 服务器 |
| `MCP: Disconnect from MCP Server` | 断开服务器连接 |
| `MCP: List Tools` | 在编辑器中显示工具列表 |
| `MCP: List Resources` | 在编辑器中显示资源列表 |
| `MCP: List Prompts` | 在编辑器中显示提示词列表 |
| `MCP: Ping Server` | 测试服务器连接 |
| `MCP: Show Connection Status` | 显示连接状态信息 |
| `MCP: Clear Request History` | 清除请求历史记录 |
| `MCP: Export Server Configuration` | 导出服务器配置 |
| `MCP: Import Server Configuration` | 导入服务器配置 |

## 🏗️ 项目架构

```
mcp-tester/
├── src/
│   ├── extension.ts              # VSCode 扩展主入口
│   ├── mcp-tester-provider.ts    # WebView 提供器，处理 UI 交互
│   ├── server/
│   │   └── mcp-server-manager.ts # MCP 服务器管理器，处理协议通信
│   └── vue-webview/             # Vue.js 前端界面
│       ├── src/
│       │   ├── components/      # Vue 组件
│       │   │   ├── MainApp.vue  # 主应用组件
│       │   │   ├── Sidebar.vue  # 侧边栏组件
│       │   │   ├── ToolsPanel.vue # 工具面板组件
│       │   │   └── ...          # 其他功能组件
│       │   ├── assets/styles/   # 样式文件
│       │   └── main.ts         # Vue 应用入口
│       ├── package.json
│       └── vite.config.ts
├── package.json                 # 扩展配置和依赖
├── webpack.config.js           # Webpack 构建配置
└── tsconfig.json              # TypeScript 配置
```

### 架构特点

1. **分层架构**: 
   - **扩展层**: VSCode 扩展 API 集成
   - **业务层**: MCP 协议处理和状态管理
   - **表现层**: Vue.js WebView 界面

2. **事件驱动**: 
   - 使用 EventEmitter 进行组件间通信
   - 支持实时状态更新和通知

3. **模块化设计**: 
   - 独立的服务器管理器模块
   - 可复用的 Vue 组件
   - 清晰的职责分离

## 🔧 开发指南

### 开发环境要求

- **Node.js**: >= 16.x
- **npm**: >= 7.x
- **VSCode**: >= 1.74.0
- **TypeScript**: >= 4.9.x

### 开发脚本

| 命令 | 描述 |
|------|------|
| `npm run compile` | 编译 TypeScript 和构建 Vue 应用 |
| `npm run watch` | 监视模式编译 |
| `npm run build` | 完整构建项目 |
| `npm run dev-webview` | 开发模式运行 Vue 应用 |
| `npm run build-webview` | 构建 Vue 应用 |
| `npm run install-webview` | 安装 Vue 应用依赖 |
| `npm run lint` | 代码检查 |
| `npm run package` | 生产环境打包 |

### Vue WebView 开发

 Vue 前端界面位于 `src/vue-webview/` 目录：

```bash
# 进入 Vue 项目目录
cd src/vue-webview

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

### 添加新功能

1. **添加新的 MCP 协议功能**:
   - 在 `MCPServerManager` 中添加新方法
   - 在 `MCPTesterProvider` 中添加消息处理
   - 在 Vue 组件中添加 UI 交互

2. **添加新的 Vue 组件**:
   - 在 `src/vue-webview/src/components/` 创建组件
   - 在 `MainApp.vue` 中引入和使用
   - 添加相应的样式和交互逻辑

3. **添加新的 VSCode 命令**:
   - 在 `package.json` 的 `contributes.commands` 中声明
   - 在 `extension.ts` 中注册命令处理器

## 🧪 测试

### 单元测试

```bash
# 运行测试
npm test

# 监视模式测试
npm run test:watch
```

### 集成测试

1. **测试 STDIO 传输**:
```bash
# 使用官方示例服务器
npx @modelcontextprotocol/server-everything
```

2. **测试 HTTP 传输**:
```bash
# 启动 HTTP MCP 服务器
# 然后在扩展中连接到相应 URL
```

### 调试技巧

1. **启用详细日志**:
   - 在设置中启用 `mcp-tester.enableLogging`
   - 查看 VSCode 开发者控制台输出

2. **Vue DevTools**:
   - 在开发模式下可以使用 Vue DevTools
   - WebView 调试需要启用开发者模式

3. **网络调试**:
   - 使用浏览器开发者工具监控 HTTP 请求
   - 检查 WebSocket 连接状态

## 🤝 贡献指南

### 提交代码

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 代码规范

- **TypeScript**: 使用严格模式，提供完整类型注解
- **Vue**: 使用 Composition API 和 `<script setup>` 语法
- **样式**: 使用 VSCode 主题变量，保持一致性
- **注释**: 重要逻辑提供中文注释

### 提交信息格式

```
type(scope): description

[optional body]

[optional footer]
```

类型包括:
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建或辅助工具变动