# MCP Tester VSCode 扩展安装指南

## 扩展简介

MCP Tester 是一个功能强大的 VSCode 扩展，用于测试和调试 Model Context Protocol (MCP) 服务器。它提供了一个完整的图形化界面，让您可以轻松连接、测试和管理 MCP 服务器。

## 功能特性

- 🔌 **多种传输协议支持**: STDIO、SSE、Streamable HTTP
- 🛠 **工具调用测试**: 列出和调用 MCP 服务器提供的工具
- 📝 **资源管理**: 浏览和访问服务器资源
- 💬 **提示模板**: 管理和使用预定义提示
- 📊 **实时监控**: 连接状态和请求历史追踪
- ⚙️ **配置管理**: 保存和加载服务器配置
- 🎨 **现代界面**: 基于 Vue 3 的响应式 WebView 界面

## 安装方法

### 方法 1: 直接安装 VSIX 文件

1. 打开 VSCode
2. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (macOS) 打开命令面板
3. 输入 "Extensions: Install from VSIX..."
4. 选择 `mcp-tester-0.0.2.vsix` 文件
5. 安装完成后重启 VSCode

### 方法 2: 命令行安装

```bash
code --install-extension mcp-tester-0.0.2.vsix
```

## 使用方法

### 1. 打开 MCP Tester

安装完成后，您可以通过以下方式打开 MCP Tester：

- 点击左侧活动栏中的 MCP Tester 图标
- 使用命令面板: `Ctrl+Shift+P` → "MCP: Open MCP Tester"
- 使用快捷命令: `Ctrl+Shift+M` (如果配置了)

### 2. 连接到 MCP 服务器

#### STDIO 连接
1. 选择传输类型: "stdio"
2. 输入服务器命令，例如: `node server.js`
3. 可选：配置环境变量 (JSON 格式)
4. 输入服务器名称
5. 点击 "Connect" 按钮

#### SSE/HTTP 连接
1. 选择传输类型: "sse" 或 "streamable-http"
2. 输入服务器 URL，例如: `http://localhost:3000/sse`
3. 输入服务器名称
4. 点击 "Connect" 按钮

### 3. 测试工具

连接成功后：
1. 切换到 "Tools" 标签页
2. 点击 "Refresh Tools" 获取可用工具列表
3. 选择要测试的工具，点击 "Call" 按钮
4. 在弹出窗口中输入参数 (JSON 格式)
5. 点击 "Call Tool" 执行

### 4. 管理配置

- **保存配置**: 成功连接后，配置会自动保存
- **加载配置**: 在 "Saved Servers" 部分点击已保存的配置
- **删除配置**: 点击配置项右侧的 "x" 按钮

## 可用命令

在命令面板 (`Ctrl+Shift+P`) 中可以使用以下命令：

- `MCP: Open MCP Tester` - 打开 MCP Tester 界面
- `MCP: Connect to MCP Server` - 快速连接到服务器
- `MCP: Disconnect from MCP Server` - 断开当前连接
- `MCP: List Tools` - 列出可用工具
- `MCP: List Resources` - 列出可用资源
- `MCP: List Prompts` - 列出可用提示
- `MCP: Ping Server` - 测试服务器连接
- `MCP: Show Connection Status` - 显示连接状态
- `MCP: Clear Request History` - 清除请求历史
- `MCP: Export Server Configuration` - 导出服务器配置
- `MCP: Import Server Configuration` - 导入服务器配置

## 配置选项

在 VSCode 设置中可以配置以下选项：

```json
{
  "mcp-tester.autoStart": true,
  "mcp-tester.defaultTransport": "stdio",
  "mcp-tester.timeout": 3000,
  "mcp-tester.maxHistory": 100,
  "mcp-tester.enableLogging": false,
  "mcp-tester.maxRetryAttempts": 3,
  "mcp-tester.retryDelay": 1000
}
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查服务器命令或 URL 是否正确
   - 确认服务器正在运行
   - 检查环境变量配置

2. **工具调用失败**
   - 验证参数 JSON 格式是否正确
   - 检查工具所需的参数类型

3. **界面显示异常**
   - 重新加载窗口: `Ctrl+Shift+P` → "Developer: Reload Window"
   - 检查 VSCode 控制台错误信息

### 获取帮助

如果遇到问题，可以：
1. 查看 VSCode 开发者控制台 (`Help` → `Toggle Developer Tools`)
2. 检查扩展日志
3. 重启 VSCode

## 技术规格

- **VSCode 版本要求**: 1.74.0 或更高
- **Node.js 版本**: 14.0.0 或更高
- **MCP SDK 版本**: 1.18.0
- **支持的平台**: Windows, macOS, Linux

## 更新历史

### v0.0.2 (当前版本) - 修复版
- 🐛 **修复**: 解决了 WebView 资源加载问题（CSS/JS 文件找不到的错误）
- 🔧 **改进**: 优化了 VSCode 扩展的资源路径配置
- ✅ **验证**: 确保所有 WebView 资源文件正确打包到 VSIX 中
- 📝 **文档**: 更新了安装指南和故障排除说明

### v0.0.1
- 初始发布
- 支持 STDIO、SSE、Streamable HTTP 传输协议
- 完整的工具测试功能
- 配置管理和历史追踪
- Vue 3 WebView 界面

---

**开发者**: Echo AI  
**版本**: 0.0.2  
**更新日期**: 2024年10月10日