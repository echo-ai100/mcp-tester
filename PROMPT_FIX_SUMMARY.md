# MCP Tester 提示词参数错误修复总结

## 修复日期
2025-10-24

## 问题描述
当用户点击"获取"按钮获取不需要参数的提示词时，系统报错：
```
获取提示词失败: MCP error 0: Missing required arguments
```

## 根本原因
前端Vue组件向后端传递空参数对象`{}`，导致MCP SDK将其序列化为`arguments: {}`传递给MCP服务器。根据MCP协议规范，当提示词不需要参数时，请求中应完全省略`arguments`字段，而不是传递空对象。

## 修复方案
在`MCPServerManager`的`getPrompt()`方法中实现参数过滤逻辑：
- 检查参数对象是否为空
- 如果为空，则在请求中省略`arguments`字段
- 如果有有效参数，则包含`arguments`字段

## 代码修改

### 文件：`src/server/mcp-server-manager.ts`

**修改前**（第426-433行）：
```typescript
//获取提示词
public async getPrompt(name: string, arguments_: Record<string, string> = {}): Promise<GetPromptResult> {
    const request: ClientRequest = {
        method: "prompts/get" as const,
        params: { name, arguments: arguments_ }
    };
    
    return this._makeRequest(request);
}
```

**修改后**：
```typescript
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
```

## 修复逻辑说明

### 判断条件
```typescript
const hasValidArguments = arguments_ && Object.keys(arguments_).length > 0;
```

### 协议请求格式

| 场景 | 输入 | 发送的请求 |
|------|------|-----------|
| 无参数提示词 | `{}` | `{method: "prompts/get", params: {name}}` |
| 空参数对象 | `undefined` | `{method: "prompts/get", params: {name}}` |
| 有有效参数 | `{arg1: 'value'}` | `{method: "prompts/get", params: {name, arguments: {...}}}` |

## 构建与验证

### 编译验证
```bash
npm run compile
```
✅ 编译成功，无TypeScript错误

### 生产构建
```bash
npm run package
```
✅ 构建成功

### VSIX打包
```bash
npx @vscode/vsce package --allow-missing-repository --out mcp-tester-0.0.2.vsix
```
✅ 打包成功，生成文件：`mcp-tester-0.0.2.vsix` (4.0MB)

## 测试场景

| 测试用例 | 提示词类型 | 参数配置 | 预期结果 | 状态 |
|---------|-----------|---------|---------|------|
| TC01 | 无参数提示词 | 无arguments定义 | ✅ 成功获取提示词内容 | ✅ |
| TC02 | 可选参数提示词 | 1个可选参数，不填写 | ✅ 成功获取默认内容 | ✅ |
| TC03 | 可选参数提示词 | 1个可选参数，填写值 | ✅ 成功获取带参数内容 | ✅ |
| TC04 | 必需参数提示词 | 1个必需参数，不填写 | ❌ 前端提示"参数必需" | ✅ |
| TC05 | 必需参数提示词 | 1个必需参数，填写值 | ✅ 成功获取内容 | ✅ |

## 影响范围
- ✅ 仅影响`getPrompt()`方法
- ✅ 不影响工具调用功能
- ✅ 不影响资源读取功能
- ✅ 不影响其他MCP协议请求

## 版本信息
- 当前版本：0.0.2
- 修复类型：Bug修复（协议兼容性）
- 修改文件数：1个
- 修改行数：+7行，-1行

## 安装方法
```bash
# 在VSCode中，使用命令面板（Cmd+Shift+P）
# 输入: Extensions: Install from VSIX...
# 选择文件: mcp-tester-0.0.2.vsix
```

## 验证清单
- [x] 代码编译无错误
- [x] Vue WebView构建成功
- [x] VSIX包生成成功
- [x] 修复逻辑符合MCP协议规范
- [x] 所有测试场景通过
- [x] 无回归问题

## 技术要点
1. **MCP协议规范**：无参数时应省略`arguments`字段
2. **单一职责原则**：在服务层处理协议细节
3. **向后兼容**：保持对有参数场景的完全支持
4. **防御式编程**：检查参数对象的有效性

## 相关文档
- 设计文档：参见项目中的设计文档
- MCP协议规范：https://modelcontextprotocol.io/specification
- 修复历史：BUGFIX.md, CRITICAL_FIX.md

## 备注
本次修复完全符合设计文档要求，已通过所有验证步骤。VSIX包已准备好用于生产部署。
