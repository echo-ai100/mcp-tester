<template>
  <div class="tools-tab h-full flex flex-col">
    <!-- 头部控制 -->
    <div class="flex-shrink-0 p-4 border-b border-vscode-panel-border">
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-medium text-vscode-foreground">Tools List</h3>
        <button
          @click="$emit('refresh')"
          :disabled="!isConnected || loading"
          class="btn-secondary text-xs disabled:opacity-50"
        >
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- 工具列表 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="text-center py-8 text-vscode-foreground opacity-75">
        Loading tools...
      </div>
      
      <div v-else-if="tools.length === 0" class="text-center py-8 text-vscode-foreground opacity-75">
        {{ isConnected ? 'No tools available' : 'Please connect to a server first' }}
      </div>
      
      <div v-else class="p-4 space-y-3">
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
              <div v-if="tool.inputSchema && hasProperties(tool.inputSchema)" class="mb-3">
                <div class="text-xs text-vscode-foreground opacity-60 mb-2">Parameters:</div>
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
                console.log('ToolsTab: Calling tool', tool.name);
                callTool(tool);
              }"
              :disabled="!isConnected"
              class="ml-3 btn-primary text-sm disabled:opacity-50 flex-shrink-0"
            >
              Call
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具调用模态框 -->
    <div v-if="showCallModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-vscode-panel-bg rounded-md p-6 w-11/12 max-w-2xl max-h-5/6 overflow-y-auto border border-vscode-panel-border">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-vscode-foreground">Call Tool: {{ selectedTool?.name }}</h3>
          <button @click="showCallModal = false" class="text-vscode-foreground hover:text-red-400">
            ✕
          </button>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-vscode-foreground mb-2">Parameters (JSON):</label>
          <textarea
            v-model="toolArguments"
            class="w-full h-32 bg-vscode-editor-background text-vscode-editor-foreground border border-vscode-panel-border rounded p-2 font-mono text-sm resize-none"
            placeholder='{"param": "value"}'
            @keydown.ctrl.enter="executeTool"
          ></textarea>
          <div class="text-xs text-vscode-foreground opacity-60 mt-1">
            Tip: Use Ctrl+Enter for quick execution
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button @click="showCallModal = false" class="btn-secondary">Cancel</button>
          <button @click="executeTool" :disabled="executing" class="btn-primary">
            {{ executing ? 'Executing...' : 'Execute Tool' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Props
interface Props {
  tools: any[];
  isConnected: boolean;
  loading: boolean;
}

defineProps<Props>();

// Emits
const emit = defineEmits<{
  refresh: [];
  'call-tool': [toolName: string, parameters: any];
}>();

// 状态
const showCallModal = ref(false);
const selectedTool = ref<any>(null);
const toolArguments = ref('{}');
const executing = ref(false);

// 方法
const hasProperties = (schema: any): boolean => {
  return schema && schema.properties && Object.keys(schema.properties).length > 0;
};

const callTool = (tool: any) => {
  console.log('ToolsTab: callTool called with tool:', tool);
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
  
  console.log('ToolsTab: Setting showCallModal to true');
  showCallModal.value = true;
};

const executeTool = async () => {
  console.log('ToolsTab: executeTool called');
  if (!selectedTool.value) {
    console.log('ToolsTab: No selected tool');
    return;
  }
  
  executing.value = true;
  try {
    // 确保 toolArguments.value 已定义
    if (!toolArguments.value) {
      toolArguments.value = '{}';
    }
    const args = JSON.parse(toolArguments.value);
    console.log('ToolsTab: Emitting call-tool event', selectedTool.value.name, args);
    emit('call-tool', selectedTool.value.name, args);
    showCallModal.value = false;
  } catch (error) {
    console.error('ToolsTab: Error parsing tool arguments', error);
    alert('Invalid parameter format, please check JSON syntax');
  } finally {
    executing.value = false;
  }
};
</script>

<style scoped>
.btn-primary {
  background-color: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
  border: none;
  padding: 6px 12px;
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
  padding: 5px 11px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 13px;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--vscode-button-secondaryHoverBackground, #45494a);
}

.bg-vscode-panel-bg {
  background-color: var(--vscode-panel-background, #252526);
}

.text-vscode-foreground {
  color: var(--vscode-foreground, #cccccc);
}

.border-vscode-panel-border {
  border-color: var(--vscode-panel-border, #2d2d30);
}

.bg-vscode-editor-background {
  background-color: var(--vscode-editor-background, #1e1e1e);
}

.text-vscode-editor-foreground {
  color: var(--vscode-editor-foreground, #d4d4d4);
}
</style>