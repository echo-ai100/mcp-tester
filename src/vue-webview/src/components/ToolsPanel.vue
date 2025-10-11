<template>
  <div class="tools-panel h-full flex flex-col bg-gray-900">
    <!-- 头部 -->
    <div class="p-4 border-b border-gray-700">
      <h3 class="text-lg font-semibold text-white">Tools</h3>
      <button
        @click="refreshTools"
        :disabled="!isConnected"
        class="mt-2 btn-secondary text-sm disabled:opacity-50"
      >
        Refresh Tools
      </button>
    </div>

    <!-- 工具列表 -->
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="loading" class="text-gray-400 text-center py-8">
        Loading tools...
      </div>
      
      <div v-else-if="tools.length === 0" class="text-gray-400 text-center py-8">
        {{ isConnected ? 'No tools available' : 'Connect to server to view tools' }}
      </div>
      
      <div v-else class="space-y-3">
        <div
          v-for="tool in tools"
          :key="tool.name"
          class="bg-gray-800 rounded-lg p-4 border border-gray-700"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="text-white font-medium mb-1">{{ tool.name }}</h4>
              <p v-if="tool.description" class="text-gray-300 text-sm mb-3">
                {{ tool.description }}
              </p>
              
              <!-- 参数信息 -->
              <div v-if="tool.inputSchema" class="mb-3">
                <div class="text-xs text-gray-400 mb-2">Parameters:</div>
                <div class="bg-gray-900 rounded p-2 text-xs text-gray-300 font-mono">
                  {{ formatSchema(tool.inputSchema) }}
                </div>
              </div>
            </div>
            
            <button
              @click="callTool(tool)"
              :disabled="!isConnected"
              class="ml-3 btn-primary text-sm disabled:opacity-50"
            >
              Call
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具调用模态框 -->
    <div v-if="showCallModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-lg p-6 w-96 max-w-full max-h-full overflow-y-auto">
        <h3 class="text-lg font-semibold text-white mb-4">Call Tool: {{ selectedTool?.name }}</h3>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">Arguments (JSON):</label>
          <textarea
            v-model="toolArguments"
            class="w-full h-32 input-field font-mono text-sm"
            placeholder='{"param": "value"}'
          ></textarea>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button @click="showCallModal = false" class="btn-secondary">Cancel</button>
          <button @click="executeTool" :disabled="executing" class="btn-primary">
            {{ executing ? 'Calling...' : 'Call Tool' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// Props & State
const tools = ref<any[]>([]);
const loading = ref(false);
const isConnected = ref(false);
const showCallModal = ref(false);
const selectedTool = ref<any>(null);
const toolArguments = ref('{}');
const executing = ref(false);

// 模拟连接状态
onMounted(() => {
  // 这里应该从父组件或状态管理获取连接状态
  // 暂时设为 true 用于演示
  isConnected.value = true;
});

// 方法
const refreshTools = async () => {
  if (!isConnected.value) return;
  
  loading.value = true;
  try {
    // 发送消息到扩展
    postMessage({
      type: 'listTools'
    });
  } catch (error) {
    console.error('Failed to refresh tools:', error);
  } finally {
    loading.value = false;
  }
};

const callTool = (tool: any) => {
  selectedTool.value = tool;
  toolArguments.value = '{}';
  showCallModal.value = true;
};

const executeTool = async () => {
  if (!selectedTool.value) return;
  
  executing.value = true;
  try {
    const args = JSON.parse(toolArguments.value);
    postMessage({
      type: 'callTool',
      data: {
        name: selectedTool.value.name,
        arguments: args
      }
    });
    showCallModal.value = false;
  } catch (error) {
    alert('Invalid JSON arguments');
  } finally {
    executing.value = false;
  }
};

const formatSchema = (schema: any) => {
  try {
    return JSON.stringify(schema, null, 2);
  } catch {
    return 'Invalid schema';
  }
};

// 模拟 postMessage
const postMessage = (message: any) => {
  if (typeof window !== 'undefined' && (window as any).vscode) {
    (window as any).vscode.postMessage(message);
  } else {
    console.log('Would send message:', message);
  }
};

// 监听来自扩展的消息
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'toolsUpdated':
        tools.value = message.data || [];
        break;
      case 'connectionStatusChanged':
        isConnected.value = message.data.connected;
        break;
    }
  });
}
</script>