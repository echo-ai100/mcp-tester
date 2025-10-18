<template>
  <div class="mcp-tester-app">
    <!-- 侧边栏（简化版） -->
    <div 
      v-if="isMainView"
      class="sidebar bg-vscode-panel-bg border-r border-vscode-panel-border flex flex-col h-full"
    >
      <div class="p-4 border-b border-vscode-panel-border">
        <h2 class="text-lg font-semibold text-vscode-foreground">MCP Tester</h2>
        <div class="mt-2 flex items-center text-sm">
          <span class="w-2 h-2 rounded-full mr-2" :class="connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'"></span>
          <span :class="connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'">
            {{ connectionStatus === 'connected' ? '已连接' : '未连接' }}
          </span>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <!-- 连接配置 -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2 text-vscode-foreground">
              传输类型
            </label>
            <select v-model="transportType" class="w-full input-field">
              <option value="stdio">STDIO</option>
              <option value="sse">SSE</option>
              <option value="streamable-http">Streamable HTTP</option>
            </select>
          </div>

          <!-- STDIO 配置 -->
          <div v-if="transportType === 'stdio'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1 text-vscode-foreground">命令</label>
              <input 
                v-model="config.command" 
                type="text" 
                class="w-full input-field"
                placeholder="node server.js 或 npx @modelcontextprotocol/server-everything"
              >
            </div>
            <div>
              <label class="block text-sm font-medium mb-1 text-vscode-foreground">参数（可选）</label>
              <input 
                v-model="argsInput" 
                type="text" 
                class="w-full input-field"
                placeholder="arg1 arg2 arg3"
              >
            </div>
            <div>
              <label class="block text-sm font-medium mb-1 text-vscode-foreground">环境变量（JSON格式，可选）</label>
              <textarea 
                v-model="envVarsInput" 
                class="w-full input-field text-xs" 
                rows="3"
                placeholder='{"API_KEY":"your-key","DEBUG":"true"}'
              ></textarea>
            </div>
          </div>

          <!-- HTTP 配置 -->
          <div v-else class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1 text-vscode-foreground">
                {{ transportType === 'sse' ? 'SSE URL' : 'HTTP URL' }}
              </label>
              <input 
                v-model="config.url" 
                type="text" 
                class="w-full input-field"
                :placeholder="transportType === 'sse' ? 'http://localhost:3000/sse' : 'http://localhost:3000/mcp'"
              >
            </div>
            <div>
              <label class="block text-sm font-medium mb-1 text-vscode-foreground">自定义Headers（JSON格式，可选）</label>
              <textarea 
                v-model="headersInput" 
                class="w-full input-field text-xs" 
                rows="3"
                placeholder='{"Authorization":"Bearer token","X-API-Key":"key"}'
              ></textarea>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1 text-vscode-foreground">服务器名称</label>
            <input 
              v-model="serverName" 
              type="text" 
              class="w-full input-field"
              placeholder="My MCP Server"
            >
          </div>
        </div>

        <!-- 连接按钮 -->
        <div class="mt-6 space-y-2">
          <button 
            @click="handleConfiguredConnect" 
            :disabled="!canConnect || connectionStatus === 'connecting'" 
            class="w-full btn-primary disabled:opacity-50"
          >
            {{ connectionStatus === 'connecting' ? '连接中...' : (connectionStatus === 'connected' ? '重新连接' : '连接') }}
          </button>
          
          <button 
            v-if="connectionStatus === 'connected'" 
            @click="handleDisconnect" 
            class="w-full btn-secondary"
          >
            断开连接
          </button>
          
          <button 
            v-if="connectionStatus === 'connected'" 
            @click="handleOpenToolsPanel" 
            class="w-full btn-primary"
          >
            打开工具面板
          </button>
        </div>
        
        <!-- 保存的服务器 -->
        <div v-if="savedServers.length > 0" class="mt-6">
          <h3 class="text-sm font-medium mb-3 text-vscode-foreground">已保存的服务器</h3>
          <div class="space-y-2">
            <div 
              v-for="server in savedServers" 
              :key="server.name"
              class="p-3 border border-vscode-panel-border rounded cursor-pointer hover:bg-vscode-list-hoverBackground"
              @click="loadServerConfig(server)"
            >
              <div class="flex justify-between items-center">
                <div>
                  <div class="text-sm font-medium text-vscode-foreground">{{ server.name }}</div>
                  <div class="text-xs text-vscode-descriptionForeground">{{ server.type }}{{ server.url ? ': ' + server.url : '' }}</div>
                </div>
                <div class="flex space-x-1">
                  <button 
                    @click.stop="connectToSavedServer(server)" 
                    class="text-green-400 hover:text-green-300 p-1" 
                    title="连接"
                  >
                    ▶
                  </button>
                  <button 
                    @click.stop="postMessage({ type: 'delete-server', name: server.name })" 
                    class="text-red-400 hover:text-red-300 p-1" 
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 主要内容区域 -->
    <div class="main-content" :class="{ 'with-sidebar': isMainView }">
      <!-- 新的带Tab的工具面板视图 -->
      <div 
        v-if="isToolsPanel"
        class="tab-tools-panel h-full flex flex-col bg-vscode-panel-bg"
      >
        <!-- 头部 -->
        <div class="flex-shrink-0 p-4 border-b border-vscode-panel-border">
          <h2 class="text-lg font-semibold text-vscode-foreground mb-3">MCP Tools Panel</h2>
          
          <!-- 连接状态 -->
          <div class="flex items-center text-sm mb-4">
            <span class="w-2 h-2 rounded-full mr-2" :class="connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'"></span>
            <span :class="connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'">
              {{ connectionStatus === 'connected' ? '已连接' : '未连接' }}
            </span>
            <button 
              v-if="connectionStatus === 'connected'" 
              @click="handlePing" 
              class="ml-4 btn-secondary text-xs"
            >
              Ping
            </button>
          </div>

          <!-- Tab 导航 -->
          <div class="flex space-x-1 bg-vscode-panel-border rounded-md p-1">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
                activeTab === tab.id
                  ? 'bg-vscode-tab-activeBackground text-vscode-tab-activeForeground'
                  : 'text-vscode-tab-inactiveForeground hover:text-vscode-tab-activeForeground hover:bg-vscode-tab-hoverBackground'
              ]"
            >
              {{ tab.label }}
              <span v-if="tab.count !== undefined" class="ml-2 text-xs opacity-75">
                ({{ tab.count }})
              </span>
            </button>
          </div>
        </div>

        <!-- Tab 内容 -->
        <div class="flex-1 overflow-hidden">
          <!-- Tools Tab -->
          <div v-show="activeTab === 'tools'" class="h-full flex flex-col">
            <div class="flex-shrink-0 p-4 border-b border-vscode-panel-border">
              <div class="flex justify-between items-center">
                <h3 class="text-sm font-medium text-vscode-foreground">工具列表</h3>
                <button
                  @click="handleListTools"
                  :disabled="connectionStatus !== 'connected'"
                  class="btn-secondary text-xs disabled:opacity-50"
                >
                  刷新
                </button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <div v-if="tools.length === 0" class="text-center py-8 text-vscode-foreground opacity-75">
                {{ connectionStatus === 'connected' ? '没有可用的工具' : '请先连接到服务器' }}
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="tool in tools"
                  :key="tool.name"
                  class="bg-vscode-panel-bg border border-vscode-panel-border rounded-md p-4 hover:bg-opacity-80 transition-colors"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <h4 class="text-vscode-foreground font-medium mb-1">{{ tool.name }}</h4>
                      <p v-if="tool.description" class="text-vscode-foreground opacity-75 text-sm mb-3">
                        {{ tool.description }}
                      </p>
                      <!-- 参数信息 -->
                      <div v-if="tool.inputSchema && tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0" class="mb-3">
                        <div class="text-xs text-vscode-foreground opacity-60 mb-2">参数:</div>
                        <div class="bg-vscode-editor-background rounded p-2 text-xs text-vscode-editor-foreground font-mono">
                          <div v-for="(prop, name) in tool.inputSchema.properties" :key="name" class="mb-1">
                            <span class="text-blue-300">{{ name }}</span>
                            <span class="text-gray-400">: {{ prop.type || 'any' }}</span>
                            <span v-if="prop.description" class="text-gray-500 ml-2">// {{ prop.description }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      @click="() => {
                        console.log('MainApp: Calling tool', tool.name);
                        callTool(tool);
                      }"
                      :disabled="connectionStatus !== 'connected'"
                      class="ml-3 btn-primary text-sm disabled:opacity-50 flex-shrink-0"
                    >
                      调用
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Resources Tab -->
          <div v-show="activeTab === 'resources'" class="h-full flex flex-col">
            <div class="flex-shrink-0 p-4 border-b border-vscode-panel-border">
              <div class="flex justify-between items-center">
                <h3 class="text-sm font-medium text-vscode-foreground">资源列表</h3>
                <button
                  @click="handleListResources"
                  :disabled="connectionStatus !== 'connected'"
                  class="btn-secondary text-xs disabled:opacity-50"
                >
                  刷新
                </button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <div v-if="resources.length === 0" class="text-center py-8 text-vscode-foreground opacity-75">
                {{ connectionStatus === 'connected' ? '没有可用的资源' : '请先连接到服务器' }}
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="resource in resources"
                  :key="resource.uri"
                  class="bg-vscode-panel-bg border border-vscode-panel-border rounded-md p-4 hover:bg-opacity-80 transition-colors"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <h4 class="text-vscode-foreground font-medium mb-1">{{ resource.name || resource.uri }}</h4>
                      <p v-if="resource.description" class="text-vscode-foreground opacity-75 text-sm mb-2">
                        {{ resource.description }}
                      </p>
                      <div class="text-xs text-vscode-foreground opacity-60">
                        URI: {{ resource.uri }}
                      </div>
                    </div>
                    <button
                      @click="handleReadResource(resource.uri)"
                      :disabled="connectionStatus !== 'connected'"
                      class="ml-3 btn-primary text-sm disabled:opacity-50 flex-shrink-0"
                    >
                      读取
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Prompts Tab -->
          <div v-show="activeTab === 'prompts'" class="h-full flex flex-col">
            <div class="flex-shrink-0 p-4 border-b border-vscode-panel-border">
              <div class="flex justify-between items-center">
                <h3 class="text-sm font-medium text-vscode-foreground">提示词列表</h3>
                <button
                  @click="handleListPrompts"
                  :disabled="connectionStatus !== 'connected'"
                  class="btn-secondary text-xs disabled:opacity-50"
                >
                  刷新
                </button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <div v-if="prompts.length === 0" class="text-center py-8 text-vscode-foreground opacity-75">
                {{ connectionStatus === 'connected' ? '没有可用的提示词' : '请先连接到服务器' }}
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="prompt in prompts"
                  :key="prompt.name"
                  class="bg-vscode-panel-bg border border-vscode-panel-border rounded-md p-4 hover:bg-opacity-80 transition-colors"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <h4 class="text-vscode-foreground font-medium mb-1">{{ prompt.name }}</h4>
                      <p v-if="prompt.description" class="text-vscode-foreground opacity-75 text-sm mb-3">
                        {{ prompt.description }}
                      </p>
                    </div>
                    <button
                      @click="handleGetPrompt(prompt.name, {})"
                      :disabled="connectionStatus !== 'connected'"
                      class="ml-3 btn-primary text-sm disabled:opacity-50 flex-shrink-0"
                    >
                      获取
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 工具执行结果展示区域 -->
        <div v-if="toolExecutionResult && activeTab === 'tools'" class="border-t border-vscode-panel-border p-4 bg-vscode-panel-bg">
          <div class="flex justify-between items-center mb-2">
            <h4 class="text-sm font-medium text-vscode-foreground">执行结果</h4>
            <button @click="clearToolResult" class="text-vscode-foreground hover:text-red-400 text-xs">
              清除
            </button>
          </div>
          <pre class="bg-vscode-editor-background p-3 rounded text-xs text-vscode-editor-foreground overflow-auto max-h-40">{{ formatToolResult(toolExecutionResult) }}</pre>
        </div>
      </div>
      
      <!-- 主视图 -->
      <div v-else-if="isMainView" class="main-view">
        <div v-if="connectionStatus === 'connected'" class="connected-content">
          <h2>MCP 服务器已连接</h2>
          <p>服务器能力：{{ Object.keys(serverCapabilities).join(', ') }}</p>
          <button @click="handleOpenToolsPanel" class="primary-button">
            打开工具面板
          </button>
        </div>
        <div v-else class="disconnected-content">
          <h2>MCP Tester</h2>
          <p>请在左侧配置并连接到 MCP 服务器</p>
        </div>
      </div>
    </div>
    
    <!-- 工具调用模态框 -->
    <div v-if="showCallModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-vscode-panel-bg rounded-md p-6 w-11/12 max-w-2xl max-h-5/6 overflow-y-auto border border-vscode-panel-border">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-vscode-foreground">调用工具: {{ selectedTool?.name }}</h3>
          <button @click="showCallModal = false" class="text-vscode-foreground hover:text-red-400">
            ✕
          </button>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-vscode-foreground mb-2">参数 (JSON):</label>
          <textarea
            v-model="toolArguments"
            class="w-full h-32 bg-vscode-editor-background text-vscode-editor-foreground border border-vscode-panel-border rounded p-2 font-mono text-sm resize-none"
            placeholder='{"param": "value"}'
            @keydown.ctrl.enter="executeTool"
          ></textarea>
          <div class="text-xs text-vscode-foreground opacity-60 mt-1">
            提示: 使用 Ctrl+Enter 快速执行
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button @click="showCallModal = false" class="btn-secondary">取消</button>
          <button @click="executeTool" :disabled="executing" class="btn-primary">
            {{ executing ? '执行中...' : '执行工具' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 通知组件（简化） -->
    <div 
      v-if="notifications.length > 0"
      class="fixed top-4 right-4 space-y-2 z-50"
    >
      <div 
        v-for="notification in notifications.slice(0, 5)" 
        :key="notification.id"
        class="bg-blue-600 text-white p-3 rounded shadow-lg max-w-sm"
      >
        <div class="flex justify-between items-start">
          <span class="text-sm">{{ notification.method || '通知' }}</span>
          <button @click="handleDismissNotification(notification.id)" class="ml-2 text-white hover:text-gray-200">×</button>
        </div>
        <div v-if="notification.params" class="text-xs mt-1 opacity-90">
          {{ JSON.stringify(notification.params).substring(0, 100) }}...
        </div>
      </div>
    </div>
    
    <!-- 错误弹窗（简化） -->
    <div v-if="error" class="fixed top-4 right-4 bg-red-600 text-white p-3 rounded shadow-lg z-50 max-w-sm">
      <div class="flex justify-between items-center">
        <span class="text-sm">{{ error }}</span>
        <button @click="error = null" class="ml-2 text-white hover:text-gray-200">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';

// 响应式数据
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
const serverCapabilities = reactive<Record<string, any>>({});
const savedServers = ref<any[]>([]);
const tools = ref<any[]>([]);
const resources = ref<any[]>([]);
const resourceTemplates = ref<any[]>([]);
const prompts = ref<any[]>([]);
const toolResult = ref<any>(null);
const resourceContent = ref<Record<string, any>>({});
const promptContent = ref<any>(null);
const notifications = ref<any[]>([]);
const requestHistory = ref<any[]>([]);
const error = ref<string | null>(null);

// 工具执行结果
const toolExecutionResult = ref<any>(null);

// Tab状态
const activeTab = ref('tools');

// 连接配置状态
const transportType = ref('stdio');
const serverName = ref('');
const argsInput = ref('');
const envVarsInput = ref('');
const headersInput = ref('');
const config = reactive({
  command: '',
  url: '',
  args: [] as string[],
  env: {} as Record<string, string>,
  customHeaders: {} as Record<string, string>
});

// 工具调用模态框状态
const showCallModal = ref(false);
const selectedTool = ref<any>(null);
const toolArguments = ref('{}');
const executing = ref(false);

// 计算属性
const isMainView = computed(() => {
  const viewType = document.getElementById('app')?.getAttribute('data-view');
  return !viewType || viewType === 'main';
});

const isToolsPanel = computed(() => {
  const viewType = document.getElementById('app')?.getAttribute('data-view');
  return viewType === 'tools-panel';
});

// 是否可以连接
const canConnect = computed(() => {
  if (!serverName.value.trim()) return false;
  
  if (transportType.value === 'stdio') {
    return config.command.trim() !== '';
  } else {
    return config.url.trim() !== '';
  }
});

// Tab 配置
const tabs = computed(() => [
  { id: 'tools', label: 'Tools', count: tools.value.length },
  { id: 'resources', label: 'Resources', count: resources.value.length },
  { id: 'prompts', label: 'Prompts', count: prompts.value.length }
]);

// VSCode API
let vscode: any = null;

// 初始化
onMounted(() => {
  try {
    // @ts-ignore
    if (typeof acquireVsCodeApi !== 'undefined') {
      // @ts-ignore
      vscode = acquireVsCodeApi();
      setupMessageHandlers();
      
      // 请求初始状态
      postMessage({ type: 'get-status' });
    }
  } catch (err) {
    console.error('初始化失败:', err);
  }
});

// 消息处理
function setupMessageHandlers() {
  window.addEventListener('message', (event) => {
    const message = event.data;
    
    switch (message.type) {
      case 'connection-status':
        connectionStatus.value = message.status;
        Object.assign(serverCapabilities, message.capabilities || {});
        savedServers.value = message.savedServers || [];
        break;
        
      case 'tools-list':
        tools.value = message.tools || [];
        break;
        
      case 'tool-result':
        toolResult.value = message.result;
        // 显示工具执行结果
        showToolResult(message.result);
        break;
        
      case 'tool-error':
        error.value = `工具 ${message.toolName} 调用失败: ${message.error}`;
        // 显示工具执行错误
        showToolResult({ error: message.error });
        break;
        
      case 'resources-list':
        resources.value = message.resources || [];
        break;
        
      case 'resource-templates-list':
        resourceTemplates.value = message.resourceTemplates || [];
        break;
        
      case 'resource-content':
        resourceContent.value[message.uri] = message.content;
        break;
        
      case 'prompts-list':
        prompts.value = message.prompts || [];
        break;
        
      case 'prompt-content':
        promptContent.value = message.content;
        break;
        
      case 'notification':
        notifications.value.unshift({
          id: Date.now(),
          ...message.notification,
          timestamp: message.timestamp
        });
        // 保持通知数量在合理范围内
        if (notifications.value.length > 50) {
          notifications.value = notifications.value.slice(0, 50);
        }
        break;
        
      case 'history-updated':
        requestHistory.value = message.history || [];
        break;
        
      case 'error':
        error.value = message.error;
        break;
        
      case 'load-config':
        // 处理配置加载
        break;
        
      default:
        console.log('未处理的消息:', message);
    }
  });
}

// 监听输入变化
watch(argsInput, (newValue: string) => {
  config.args = newValue ? newValue.trim().split(/\s+/).filter((arg: string) => arg) : [];
});

watch(envVarsInput, (newValue: string) => {
  try {
    if (newValue && newValue.trim()) {
      config.env = JSON.parse(newValue);
    } else {
      config.env = {};
    }
  } catch {
    // 忽略无效 JSON
    config.env = {};
  }
});

watch(headersInput, (newValue: string) => {
  try {
    if (newValue && newValue.trim()) {
      config.customHeaders = JSON.parse(newValue);
    } else {
      config.customHeaders = {};
    }
  } catch {
    // 忽略无效 JSON
    config.customHeaders = {};
  }
});

// 消息发送
function postMessage(message: any) {
  if (vscode) {
    vscode.postMessage(message);
  }
}

// 事件处理器
function handleConnect(config: any) {
  connectionStatus.value = 'connecting';
  
  // 确保传递的配置是完全可序列化的
  const safeConfig = config ? JSON.parse(JSON.stringify(config)) : {};
  
  postMessage({ type: 'connect', config: safeConfig });
}

// 配置连接
function handleConfiguredConnect() {
  // 构建配置对象，确保所有值都是可序列化的
  const serverConfig: any = {
    name: serverName.value.trim(),
    type: transportType.value
  };
  
  if (transportType.value === 'stdio') {
    serverConfig.command = config.command.trim();
    serverConfig.args = [...config.args]; // 创建数组副本
    serverConfig.env = { ...config.env }; // 创建对象副本
  } else {
    serverConfig.url = config.url.trim();
    serverConfig.customHeaders = { ...config.customHeaders }; // 创建对象副本
  }
  
  handleConnect(serverConfig);
}

// 加载服务器配置到表单
function loadServerConfig(server: any) {
  transportType.value = server.type;
  serverName.value = server.name;
  
  if (server.type === 'stdio') {
    config.command = server.command || '';
    config.args = server.args || [];
    argsInput.value = (server.args || []).join(' ');
    config.env = server.env || {};
    envVarsInput.value = JSON.stringify(server.env || {}, null, 2);
  } else {
    config.url = server.url || '';
    config.customHeaders = server.customHeaders || {};
    headersInput.value = JSON.stringify(server.customHeaders || {}, null, 2);
  }
}

// 连接到已保存的服务器
function connectToSavedServer(server: any) {
  // 创建一个安全的配置对象，只包含可序列化的属性
  const safeServerConfig = {
    name: server.name,
    type: server.type,
    command: server.command,
    args: server.args,
    url: server.url,
    env: server.env,
    customHeaders: server.customHeaders
  };
  handleConnect(safeServerConfig);
}

function handleDisconnect() {
  postMessage({ type: 'disconnect' });
}

function handleOpenToolsPanel() {
  postMessage({ type: 'open-tools-panel' });
}

function handleListTools() {
  postMessage({ type: 'list-tools' });
}

// 工具调用方法
function callTool(tool: any) {
  console.log('MainApp: callTool called with tool:', tool);
  selectedTool.value = tool;
  
  // 根据工具的输入模式生成默认参数
  if (tool.inputSchema && tool.inputSchema.properties) {
    const defaultArgs: Record<string, any> = {};
    Object.entries(tool.inputSchema.properties).forEach(([name, prop]: [string, any]) => {
      if (prop.default !== undefined) {
        defaultArgs[name] = prop.default;
      } else if (prop.type === 'string') {
        defaultArgs[name] = '';
      } else if (prop.type === 'number') {
        defaultArgs[name] = 0;
      } else if (prop.type === 'boolean') {
        defaultArgs[name] = false;
      } else if (prop.type === 'array') {
        defaultArgs[name] = [];
      } else if (prop.type === 'object') {
        defaultArgs[name] = {};
      } else {
        defaultArgs[name] = null;
      }
    });
    toolArguments.value = JSON.stringify(defaultArgs, null, 2);
  } else {
    toolArguments.value = '{}';
  }
  
  console.log('MainApp: Setting showCallModal to true');
  showCallModal.value = true;
}

async function executeTool() {
  console.log('MainApp: executeTool called');
  if (!selectedTool.value) {
    console.log('MainApp: No selected tool');
    return;
  }
  
  executing.value = true;
  try {
    // 确保 toolArguments.value 已定义
    if (!toolArguments.value) {
      toolArguments.value = '{}';
    }
    const args = JSON.parse(toolArguments.value);
    console.log('MainApp: Calling handleCallTool', selectedTool.value.name, args);
    handleCallTool(selectedTool.value.name, args);
    showCallModal.value = false;
  } catch (error) {
    console.error('MainApp: Error parsing tool arguments', error);
    alert('参数格式错误，请检查JSON格式');
  } finally {
    executing.value = false;
  }
}

function handleCallTool(toolName: string, parameters: any) {
  console.log('MainApp: Handling call-tool', toolName, parameters);
  // 确保参数是可序列化的
  const safeParameters = parameters ? JSON.parse(JSON.stringify(parameters)) : {};
  
  postMessage({ 
    type: 'call-tool', 
    name: toolName, 
    parameters: safeParameters
  });
}

function handleListResources() {
  postMessage({ type: 'list-resources' });
}

function handleReadResource(uri: string) {
  postMessage({ type: 'read-resource', uri });
}

function handleListPrompts() {
  postMessage({ type: 'list-prompts' });
}

function handleGetPrompt(name: string, args: Record<string, string>) {
  // 确保参数是可序列化的
  const safeArgs = args ? JSON.parse(JSON.stringify(args)) : {};
  
  postMessage({ 
    type: 'get-prompt', 
    name, 
    arguments: safeArgs
  });
}

function handlePing() {
  postMessage({ type: 'ping-server' });
}

function handleDismissNotification(id: number) {
  const index = notifications.value.findIndex(n => n.id === id);
  if (index > -1) {
    notifications.value.splice(index, 1);
  }
}

// 显示工具执行结果
function showToolResult(result: any) {
  toolExecutionResult.value = result;
}

// 清除工具执行结果
function clearToolResult() {
  toolExecutionResult.value = null;
}

// 格式化工具执行结果
function formatToolResult(result: any): string {
  if (!result) return '';
  
  try {
    // 如果是错误信息，直接返回
    if (result.error) {
      return `错误: ${result.error}`;
    }
    
    // 尝试格式化为 JSON
    return JSON.stringify(result, null, 2);
  } catch (e) {
    // 如果格式化失败，返回原始值的字符串表示
    return String(result);
  }
}
</script>

<style scoped>
.mcp-tester-app {
  display: flex;
  height: 100vh;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}

.sidebar {
  width: 300px;
  min-width: 300px;
}

.main-content {
  flex: 1;
  overflow: hidden;
}

.main-content.with-sidebar {
  margin-left: 300px;
}

.main-view {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.connected-content, .disconnected-content {
  text-align: center;
  max-width: 500px;
}

.connected-content h2, .disconnected-content h2 {
  margin-bottom: 16px;
  color: var(--vscode-titleBar-activeForeground);
}

.connected-content p, .disconnected-content p {
  margin-bottom: 24px;
  color: var(--vscode-descriptionForeground);
}

/* VSCode 主题变量 */
.bg-vscode-panel-bg {
  background-color: var(--vscode-panel-background, #252526);
}

.text-vscode-foreground {
  color: var(--vscode-foreground, #cccccc);
}

.border-vscode-panel-border {
  border-color: var(--vscode-panel-border, #2d2d30);
}

.bg-vscode-panel-border {
  background-color: var(--vscode-panel-border, #2d2d30);
}

.bg-vscode-tab-activeBackground {
  background-color: var(--vscode-tab-activeBackground, #37373d);
}

.text-vscode-tab-activeForeground {
  color: var(--vscode-tab-activeForeground, #ffffff);
}

.text-vscode-tab-inactiveForeground {
  color: var(--vscode-tab-inactiveForeground, #999999);
}

.bg-vscode-tab-hoverBackground {
  background-color: var(--vscode-tab-hoverBackground, #2a2d2e);
}

.bg-vscode-editor-background {
  background-color: var(--vscode-editor-background, #1e1e1e);
}

.text-vscode-editor-foreground {
  color: var(--vscode-editor-foreground, #d4d4d4);
}

.text-vscode-descriptionForeground {
  color: var(--vscode-descriptionForeground, #999999);
}

.bg-vscode-list-hoverBackground {
  background-color: var(--vscode-list-hoverBackground, #2a2d2e);
}

.btn-primary {
  background-color: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
  border: none;
  padding: 8px 16px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 13px;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--vscode-button-hoverBackground, #1177bb);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: var(--vscode-button-secondaryBackground, #3c3c3c);
  color: var(--vscode-button-secondaryForeground, #cccccc);
  border: 1px solid var(--vscode-button-border, #464647);
  padding: 6px 12px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 13px;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--vscode-button-secondaryHoverBackground, #45494a);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-field {
  background-color: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #cccccc);
  border: 1px solid var(--vscode-input-border, #464647);
  padding: 6px 8px;
  border-radius: 2px;
  font-size: 13px;
  font-family: var(--vscode-font-family);
}

.input-field:focus {
  outline: none;
  border-color: var(--vscode-focusBorder, #007acc);
  box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
}

.input-field::placeholder {
  color: var(--vscode-input-placeholderForeground, #999999);
}

select.input-field {
  cursor: pointer;
}

textarea.input-field {
  resize: vertical;
  min-height: 60px;
}
</style>