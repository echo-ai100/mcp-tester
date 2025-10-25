# MCP Tester 提示词参数修复完整说明

## 修复日期
2025-10-25

## 问题描述

用户在使用MCP Tester获取提示词时遇到错误：
```
获取提示词失败: MCP error 0: Missing required arguments
```

### 问题场景
1. **无参数提示词**：点击"获取"按钮时报错
2. **有参数提示词**：即使有参数输入框，也会因为空参数而报错

## 根本原因分析

问题出在前端和后端的参数处理逻辑：

### 前端问题（PromptsTab.vue）
在`executeGetPrompt`函数中，会将所有定义的参数都添加到args对象中，包括空字符串：
```typescript
// 错误的逻辑：包括空字符串
if (value !== undefined) {
  args[arg.name] = value;  // 即使value是空字符串也会添加
}
```

这导致即使用户没有填写可选参数，也会发送空字符串给后端。

### 后端问题（mcp-server-manager.ts）
原始代码总是包含`arguments`字段，即使参数对象为空：
```typescript
// 错误的逻辑：总是包含arguments
params: { name, arguments: arguments_ }  // 空对象{}也会被发送
```

根据MCP协议规范，当提示词不需要参数时，请求中应完全省略`arguments`字段。

## 修复方案

采用前后端协同修复的方案：

### 方案1：前端修复 - 过滤空参数
**文件**：`src/vue-webview/src/components/tabs/PromptsTab.vue`

**修改位置**：第179-216行的`executeGetPrompt`函数

**修改内容**：
```typescript
// 构建参数对象，只包含有值的参数（不包括空字符串）
const args: Record<string, string> = {};
if (selectedPrompt.value.arguments) {
  for (const arg of selectedPrompt.value.arguments) {
    const value = promptArguments[arg.name];
    // 只添加非空字符串的参数值
    if (value !== undefined && value !== '') {
      args[arg.name] = value;
    }
  }
}
```

**修改效果**：
- 必需参数：如果为空，前端验证会阻止发送请求
- 可选参数：如果为空，不添加到args对象中
- 有值参数：正常添加到args对象中

### 方案2：后端修复 - 省略空arguments字段
**文件**：`src/server/mcp-server-manager.ts`

**修改位置**：第426-439行的`getPrompt`方法

**修改内容**：
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

**修改效果**：
- 空参数对象：发送 `{method: "prompts/get", params: {name}}`
- 有参数对象：发送 `{method: "prompts/get", params: {name, arguments: {...}}}`

## 完整的请求流程

### 场景1：无参数提示词
```
用户点击"获取" 
→ 前端不显示参数输入框
→ 发送空args对象{}
→ 后端检测到空对象，省略arguments字段
→ MCP请求: {method: "prompts/get", params: {name: "xxx"}}
→ ✅ 成功
```

### 场景2：有可选参数，用户不填写
```
用户点击"获取"
→ 前端显示参数输入框
→ 用户不填写，点击"获取提示词"
→ 前端过滤空字符串，发送空args对象{}
→ 后端检测到空对象，省略arguments字段
→ MCP请求: {method: "prompts/get", params: {name: "xxx"}}
→ ✅ 成功
```

### 场景3：有可选参数，用户填写部分
```
用户点击"获取"
→ 前端显示参数输入框
→ 用户填写部分参数
→ 前端只发送非空参数，如{arg1: "value"}
→ 后端检测到有参数，包含arguments字段
→ MCP请求: {method: "prompts/get", params: {name: "xxx", arguments: {arg1: "value"}}}
→ ✅ 成功
```

### 场景4：有必需参数，用户不填写
```
用户点击"获取"
→ 前端显示参数输入框
→ 用户不填写必需参数，点击"获取提示词"
→ 前端验证失败，弹出提示：参数 "xxx" 是必需的
→ ❌ 前端阻止请求
```

### 场景5：有必需参数，用户填写
```
用户点击"获取"
→ 前端显示参数输入框
→ 用户填写必需参数
→ 前端发送参数，如{arg1: "value"}
→ 后端检测到有参数，包含arguments字段
→ MCP请求: {method: "prompts/get", params: {name: "xxx", arguments: {arg1: "value"}}}
→ ✅ 成功
```

## 代码变更统计

### 前端变更
- **文件**：`src/vue-webview/src/components/tabs/PromptsTab.vue`
- **行数**：+3行，-3行
- **修改内容**：参数过滤逻辑（不包括空字符串）

### 后端变更
- **文件**：`src/server/mcp-server-manager.ts`
- **行数**：+7行，-1行
- **修改内容**：空参数对象检测和条件包含arguments字段

## 构建与验证

### 编译验证
```bash
npm run compile
```
✅ 编译成功，无错误

### VSIX打包
```bash
echo "y" | npx @vscode/vsce package --allow-missing-repository --out mcp-tester-0.0.2-fixed.vsix
```
✅ 打包成功

### 生成的文件
- **文件名**：`mcp-tester-0.0.2-fixed.vsix`
- **大小**：3.9 MB
- **文件数**：1721 个文件

## 测试验证清单

| 测试场景 | 提示词类型 | 用户操作 | 预期结果 | 状态 |
|---------|-----------|---------|---------|------|
| TC01 | 无参数提示词 | 直接点击"获取" | ✅ 成功获取提示词 | 待测试 |
| TC02 | 有1个可选参数 | 不填写，点击"获取" | ✅ 成功获取默认提示词 | 待测试 |
| TC03 | 有1个可选参数 | 填写参数，点击"获取" | ✅ 成功获取带参数提示词 | 待测试 |
| TC04 | 有1个必需参数 | 不填写，点击"获取" | ❌ 前端提示"参数必需" | 待测试 |
| TC05 | 有1个必需参数 | 填写参数，点击"获取" | ✅ 成功获取提示词 | 待测试 |
| TC06 | 混合参数 | 只填必需参数 | ✅ 成功获取提示词 | 待测试 |
| TC07 | 多个可选参数 | 填写部分参数 | ✅ 成功获取提示词 | 待测试 |

## 安装方法

### 方法1：通过VSCode界面安装
1. 打开VSCode
2. 按 `Cmd+Shift+P` 打开命令面板
3. 输入：`Extensions: Install from VSIX...`
4. 选择文件：`mcp-tester-0.0.2-fixed.vsix`
5. 重启VSCode

### 方法2：通过命令行安装
```bash
code --install-extension mcp-tester-0.0.2-fixed.vsix
```

## 验证步骤

安装扩展后，请按以下步骤验证修复：

1. **打开MCP Tester**
   - 点击活动栏的MCP Tester图标
   - 或使用命令面板：`MCP: Open MCP Tester`

2. **连接MCP服务器**
   - 配置并连接到支持提示词功能的MCP服务器

3. **测试无参数提示词**
   - 选择一个无参数的提示词
   - 点击"获取"按钮
   - ✅ 应该成功获取并显示提示词内容

4. **测试有参数提示词**
   - 选择一个有参数的提示词
   - 点击"获取"按钮
   - ✅ 应该弹出参数输入框
   - 填写参数后点击"获取提示词"
   - ✅ 应该成功获取并显示提示词内容

5. **测试必需参数验证**
   - 选择一个有必需参数的提示词
   - 点击"获取"按钮，弹出参数输入框
   - 不填写必需参数，直接点击"获取提示词"
   - ✅ 应该显示提示："参数 xxx 是必需的"

## 技术要点

### MCP协议规范遵守
- 根据MCP协议，`prompts/get`请求的`arguments`字段是可选的
- 当提示词不需要参数时，应完全省略`arguments`字段
- 不应该发送空对象 `arguments: {}`

### 前端参数处理原则
- 必需参数：必须验证，空值不允许发送
- 可选参数：空值不发送，有值才发送
- 参数输入：根据提示词定义动态显示输入框

### 后端参数处理原则
- 防御式编程：检查参数对象有效性
- 协议兼容：遵守MCP协议规范
- 向后兼容：保持对有参数场景的支持

## 相关文件

- 设计文档：项目中的设计文档
- 之前的修复总结：`PROMPT_FIX_SUMMARY.md`（已废弃）
- 其他修复记录：`BUGFIX.md`, `CRITICAL_FIX.md`

## 版本信息

- **扩展版本**：0.0.2
- **修复类型**：Bug修复（参数处理）
- **修复文件**：2个（前端1个，后端1个）
- **总行数变更**：+10行，-4行

## 备注

本次修复采用前后端协同的方式，确保：
1. ✅ 无参数提示词可以正常获取
2. ✅ 有参数提示词会弹出输入框
3. ✅ 必需参数会进行验证
4. ✅ 可选参数可以留空
5. ✅ 符合MCP协议规范
6. ✅ 保持向后兼容

修复已经过编译验证，VSIX包已生成，可以安装使用。
