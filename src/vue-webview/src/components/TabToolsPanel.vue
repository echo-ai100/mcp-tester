<template>
  <div class="tab-tools-panel h-full flex flex-col bg-vscode-panel-bg">
    <!-- 头部 -->
    <div class="flex-shrink-0 p-4 border-b border-vscode-panel-border">
      <h2 class="text-lg font-semibold text-vscode-foreground mb-3">MCP Tools Panel</h2>
      
      <!-- 连接状态 -->
      <div class="flex items-center text-sm mb-4">
        <span class="w-2 h-2 rounded-full mr-2" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></span>
        <span :class="isConnected ? 'text-green-400' : 'text-red-400'">
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>
        <button 
          v-if="isConnected" 
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
        <ToolsTab
          :tools="tools"
          :is-connected="isConnected"
          :loading="loadingTools"
          @refresh="handleListTools"
          @call-tool="handleCallTool"
        />
      </div>

      <!-- Resources Tab -->
      <div v-show="activeTab === 'resources'" class="h-full flex flex-col">
        <ResourcesTab
          :resources="resources"
          :resource-templates="resourceTemplates"
          :resource-content="resourceContent"
          :is-connected="isConnected"
          :loading="loadingResources"
          @refresh="handleListResources"
          @read-resource="handleReadResource"
          @subscribe-resource="handleSubscribeResource"
          @unsubscribe-resource="handleUnsubscribeResource"
        />
      </div>

      <!-- Prompts Tab -->
      <div v-show="activeTab === 'prompts'" class="h-full flex flex-col">
        <PromptsTab
          :prompts="prompts"
          :prompt-content="promptContent"
          :is-connected="isConnected"
          :loading="loadingPrompts"
          @refresh="handleListPrompts"
          @get-prompt="handleGetPrompt"
        />
      </div>
    </div>

    <!-- 工具调用结果弹窗 -->
    <div v-if="showResultModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-vscode-panel-bg rounded-lg p-6 w-11/12 max-w-4xl max-h-5/6 overflow-y-auto border border-vscode-panel-border">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-vscode-foreground">工具调用结果</h3>
          <button @click="showResultModal = false" class="text-vscode-foreground hover:text-red-400">
            ✕
          </button>
        </div>
        <pre class="bg-vscode-editor-background p-4 rounded text-sm text-vscode-editor-foreground overflow-auto">{{
          JSON.stringify(lastToolResult, null, 2)
        }}</pre>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="fixed top-4 right-4 bg-red-600 text-white p-3 rounded shadow-lg z-50">
      <div class="flex justify-between items-center">
        <span>{{ error }}</span>
        <button @click="error = null" class="ml-2 text-white hover:text-gray-200">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import ToolsTab from './tabs/ToolsTab.vue';
import ResourcesTab from './tabs/ResourcesTab.vue';
import PromptsTab from './tabs/PromptsTab.vue';

// 响应式状态
const activeTab = ref('tools');
const isConnected = ref(false);
const serverCapabilities = reactive<Record<string, any>>({});

// 数据状态
const tools = ref<any[]>([]);
const resources = ref<any[]>([]);
const resourceTemplates = ref<any[]>([]);
const prompts = ref<any[]>([]);
const resourceContent = ref<Record<string, any>>({});
const promptContent = ref<any>(null);

// UI状态
const loadingTools = ref(false);
const loadingResources = ref(false);
const loadingPrompts = ref(false);
const showResultModal = ref(false);
const lastToolResult = ref<any>(null);
const error = ref<string | null>(null);

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
      
      // 如果已连接，加载数据
      setTimeout(() => {
        if (isConnected.value) {
          loadAllData();
        }
      }, 100);
    }
  } catch (err) {
    console.error('初始化失败:', err);
    error.value = '初始化失败: ' + String(err);
  }
});

// 消息处理
function setupMessageHandlers() {
  const handleMessage = (event: MessageEvent) => {
    const message = event.data;
    
    try {
      switch (message.type) {
        case 'connection-status':
          isConnected.value = message.status === 'connected';
          Object.assign(serverCapabilities, message.capabilities || {});
          if (isConnected.value) {
            loadAllData();
          }
          break;
          
        case 'tools-list':
          tools.value = message.tools || [];
          loadingTools.value = false;
          if (message.error) {
            error.value = `获取工具列表失败: ${message.error}`;
          }
          break;
          
        case 'tool-result':
          lastToolResult.value = message.result;
          showResultModal.value = true;
          break;
          
        case 'tool-error':
          error.value = `工具调用失败: ${message.error}`;
          break;
          
        case 'resources-list':
          resources.value = message.resources || [];
          loadingResources.value = false;
          if (message.error) {
            error.value = `获取资源列表失败: ${message.error}`;
          }
          break;
          
        case 'resource-templates-list':
          resourceTemplates.value = message.resourceTemplates || [];
          break;
          
        case 'resource-content':
          resourceContent.value[message.uri] = message.content;
          break;
          
        case 'prompts-list':
          prompts.value = message.prompts || [];
          loadingPrompts.value = false;
          if (message.error) {
            error.value = `获取提示词列表失败: ${message.error}`;
          }
          break;
          
        case 'prompt-content':
          promptContent.value = message.content;
          break;
          
        case 'ping-result':
          if (message.success) {
            error.value = null;
            // 可以显示成功消息，但我们简单忽略
          } else {
            error.value = `Ping 失败: ${message.error}`;
          }
          break;
          
        case 'error':
          error.value = message.error;
          break;
          
        default:
          console.log('未处理的消息:', message);
      }
    } catch (err) {
      console.error('处理消息时出错:', err);
      error.value = '处理消息时出错: ' + String(err);
    }
  };

  window.addEventListener('message', handleMessage);
  
  // 清理函数
  onUnmounted(() => {
    window.removeEventListener('message', handleMessage);
  });
}

// 消息发送
function postMessage(message: any) {
  if (vscode) {
    vscode.postMessage(message);
  } else {
    console.log('Would send message:', message);
  }
}

// 加载所有数据
function loadAllData() {
  if (isConnected.value) {
    handleListTools();
    handleListResources();
    handleListPrompts();
  }
}

// 事件处理器
function handleListTools() {
  if (!isConnected.value) return;
  loadingTools.value = true;
  postMessage({ type: 'list-tools' });
}

function handleCallTool(toolName: string, parameters: any) {
  if (!isConnected.value) return;
  postMessage({ 
    type: 'call-tool', 
    name: toolName, 
    parameters 
  });
}

function handleListResources() {
  if (!isConnected.value) return;
  loadingResources.value = true;
  postMessage({ type: 'list-resources' });
  postMessage({ type: 'list-resource-templates' });
}

function handleReadResource(uri: string) {
  if (!isConnected.value) return;
  postMessage({ type: 'read-resource', uri });
}

function handleSubscribeResource(uri: string) {
  if (!isConnected.value) return;
  postMessage({ type: 'subscribe-resource', uri });
}

function handleUnsubscribeResource(uri: string) {
  if (!isConnected.value) return;
  postMessage({ type: 'unsubscribe-resource', uri });
}

function handleListPrompts() {
  if (!isConnected.value) return;
  loadingPrompts.value = true;
  postMessage({ type: 'list-prompts' });
}

function handleGetPrompt(name: string, args: Record<string, string>) {
  if (!isConnected.value) return;
  postMessage({ 
    type: 'get-prompt', 
    name, 
    arguments: args 
  });
}

function handlePing() {
  if (!isConnected.value) return;
  postMessage({ type: 'ping-server' });
}
</script>

<style scoped>
/* VSCode 主题变量 */
.bg-vscode-panel-bg {
  background-color: var(--vscode-panel-background, #1e1e1e);
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

.btn-secondary {
  background-color: var(--vscode-button-secondaryBackground, #3c3c3c);
  color: var(--vscode-button-secondaryForeground, #cccccc);
  border: 1px solid var(--vscode-button-border, #464647);
  padding: 4px 8px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 11px;
}

.btn-secondary:hover {
  background-color: var(--vscode-button-secondaryHoverBackground, #45494a);
}
</style>