# MCP Tester 调试版安装和问题诊断指南

## 📦 安装调试版

已生成带调试日志的版本：**mcp-tester-0.0.2-debug.vsix** (3.96 MB)

### 安装步骤

1. **在VSCode中安装**：
   - 按 `Cmd+Shift+P`
   - 输入：`Extensions: Install from VSIX...`
   - 选择：`mcp-tester-0.0.2-debug.vsix`
   - **重启VSCode**

2. **打开开发者工具**（关键步骤！）：
   - 在VSCode中按 `Cmd+Option+I` (macOS) 或 `Ctrl+Shift+I` (Windows/Linux)
   - 或者：菜单 → Help → Toggle Developer Tools
   - 切换到 **Console** 标签页

## 🔍 问题诊断步骤

### 第一步：查看提示词列表

1. 打开MCP Tester
2. 连接到MCP服务器
3. 切换到"提示词"标签页
4. **在Console中查找日志**，应该能看到提示词列表

### 第二步：测试获取提示词

**当你点击有参数的提示词的"获取"按钮时**，在Console中会看到以下日志：

```
[PromptsTab] handleGetPromptClick called
[PromptsTab] prompt: {
  "name": "prompt-name",
  "description": "...",
  "arguments": [...]
}
[PromptsTab] prompt.arguments: [...]
[PromptsTab] arguments length: X
```

### 第三步：根据日志判断问题

#### 情况A：看到日志 `[PromptsTab] 显示参数输入框`
- ✅ 说明逻辑正确
- ✅ `showArgsModal` 被设置为 `true`
- ❓ **但弹窗没显示** → CSS或DOM渲染问题
- **解决方案**：检查是否有CSS冲突，或者尝试刷新WebView

#### 情况B：看到日志 `[PromptsTab] 无参数，直接获取提示词`
- ❌ 说明 `prompt.arguments` 为空或长度为0
- ❌ **数据问题**：服务器返回的提示词结构不正确
- **需要提供的信息**：
  - 完整的 `prompt` 对象 JSON
  - 服务器类型和配置

#### 情况C：没有看到任何 `[PromptsTab]` 日志
- ❌ 点击事件没有触发
- ❌ **事件绑定问题**或WebView通信问题
- **解决方案**：检查按钮的 `@click` 绑定

### 第四步：检查弹窗显示

如果看到 `showArgsModal set to true`，但弹窗没显示，请执行以下检查：

1. **在Console中执行**：
   ```javascript
   // 检查showArgsModal的值
   console.log('showArgsModal:', showArgsModal)
   ```

2. **检查DOM元素**：
   - 在Elements标签页搜索 `showArgsModal`
   - 查看是否有对应的 `<div v-if="showArgsModal">` 元素
   - 检查元素的 `display` 样式

## 📋 需要收集的诊断信息

如果问题依然存在，请提供以下信息：

### 1. Console日志
复制所有包含 `[PromptsTab]` 的日志行，特别是：
```
[PromptsTab] handleGetPromptClick called
[PromptsTab] prompt: {...}
[PromptsTab] prompt.arguments: [...]
[PromptsTab] arguments length: X
```

### 2. 提示词结构
复制 `prompt` 对象的完整JSON（从Console中复制）

### 3. 错误信息
如果有任何错误（红色文字），请完整复制

### 4. MCP服务器信息
- 服务器类型（STDIO/SSE/HTTP）
- 服务器命令或URL
- 服务器是否正常响应其他功能（工具、资源）

## 🎯 常见问题排查

### Q1: 弹窗一闪而过
**可能原因**：`executeGetPrompt` 被意外调用
**诊断**：查看是否有 `[PromptsTab] executeGetPrompt called` 日志紧跟在 `showArgsModal set to true` 之后

### Q2: 点击按钮没反应
**可能原因**：
1. 事件绑定失败
2. `isConnected` 为 false，按钮被禁用
**诊断**：检查按钮是否为灰色（禁用状态）

### Q3: 弹窗显示，但没有输入框
**可能原因**：`prompt.arguments` 存在但为空数组
**诊断**：查看日志中的 `arguments length: 0`

### Q4: 直接报错 "Missing required arguments"
**说明**：参数输入框没有弹出，直接调用了 `executeGetPrompt`
**原因**：`prompt.arguments` 判断失败
**诊断**：查看 `[PromptsTab] 无参数，直接获取提示词` 日志

## 🔧 临时解决方案

如果弹窗确实不显示，可以尝试：

### 方法1：手动设置参数（开发者工具）
```javascript
// 在Console中手动触发弹窗
showArgsModal.value = true
```

### 方法2：检查Vue DevTools
如果安装了Vue DevTools浏览器扩展：
1. 打开Vue DevTools
2. 查找 `PromptsTab` 组件
3. 检查 `showArgsModal` 的值
4. 手动修改为 `true`

## 📞 反馈信息模板

请按以下格式提供信息：

```
【环境信息】
- VSCode版本：
- 操作系统：
- MCP服务器类型：

【Console日志】
（粘贴所有 [PromptsTab] 开头的日志）

【提示词结构】
（粘贴 prompt 对象的JSON）

【问题描述】
1. 点击"获取"按钮后发生了什么
2. 是否有弹窗显示
3. 是否有错误提示

【其他观察】
（任何异常现象）
```

## ✅ 下一步行动

收集到诊断信息后，我将：
1. 分析日志，确定问题根因
2. 提供针对性修复方案
3. 生成最终稳定版本

---

**调试版本**：mcp-tester-0.0.2-debug.vsix  
**生成时间**：2025-10-25  
**包含**：详细的Console调试日志
