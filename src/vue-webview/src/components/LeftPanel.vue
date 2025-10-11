<template>
    <div class="h-full flex flex-col bg-vscode-panel-bg border-r border-vscode-panel-border">
        <!-- Header -->
        <div class="p-4 border-b border-vscode-panel-border">
            <h2 class="text-lg font-semibold text-vscode-foreground">MCP Inspector</h2>
            <div class="mt-2 flex items-center text-sm">
                <span class="w-2 h-2 rounded-full mr-2" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></span>
                <span :class="isConnected ? 'text-green-400' : 'text-red-400'">
                    {{ isConnected ? 'Connected' : 'Disconnected' }}
                </span>
            </div>
        </div>


        <div class="flex-1 overflow-y-auto p-4">

            <div class="mb-4">
                <label class="block text-sm font-medium mb-2">
                    Transport Type
                </label>
                <select v-model="transportType" class="w-full input-field">
                    <option value="stdio">stdio</option>
                    <option value="sse">sse</option>
                    <option value="streamable-http">streamable-http</option>
                </select>
            </div>


            <div class="space-y-4">
                <div v-if="transportType === 'stdio'" class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">Command</label>
                        <input v-model="config.command" type="text" class="w-full input-field"
                            placeholder="node server.js">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Environment Variables(JOSN)</label>
                        <textarea v-model="envVarsInput" class="w-full input-field text-xs" rows="3"
                            placeholder='{"token":"value","param":"p"}'></textarea>
                    </div>
                </div>
                <div v-else class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">
                            {{ transportType === 'sse' ? 'SSE URL' : 'Http-Stream URL' }}
                        </label>
                        <input v-model="config.url" type="text" class="w-full input-field"
                            :placeholder="transportType === 'sse' ? 'http://localhost:3000/sse' : 'http://localhost:3000/stream'" />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Server Name</label>
                    <input v-model="serverName" type="text" class="w-full input-field"
                        placeholder="Server Name">
                </div>
            </div>
            <div class="mt-6 space-y-2">
                <button @click="handleConnect" :disabled="!canConnect" class="w-full btn-primary disabled:opacity-50">{{
                    isConnected ? "Connection Active" : "Connect" }}</button>
                <button v-if="isConnected" @click="disconnect" class="w-full btn-secondary">
                    Disconnect
                </button>
            </div>
            <div v-if="configs.length > 0" class="mt-6">
                <h3 class="text-sm font-medium mb-3">Saved Servers</h3>
                <div class="space-y-2">
                    <div v-for="config in configs" :key="config.name"
                        class="p-3 border border-vscode-panel-border rounded cursor-pointer hover:bg-vscode-list-hoverBackground"
                        @click="loadConfig(config)">
                        <div class="flex justify-between items-center">
                            <div>
                                <div clas="text-sm font-medium">{{ config.name }}</div>
                                <div class="text-xs text-vscode-descriptinForeground">{{ config.type }}{{ config.url ?
                                    ':' + config.url : '' }}</div>
                            </div>
                            <button @click.stop="deleteConfig(config.name || '')" class="text-red-400 hover:text-red-300 p-1"
                                title="Delete">x</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

// 响应式数据
const isConnected = ref(false);
const transportType = ref('stdio');
const serverName = ref('');
const envVarsInput = ref('');
const configs = ref<any[]>([]);

// 配置对象
const config = ref({
  command: '',
  url: '',
  env: {} as Record<string, string>
});

// 计算属性
const canConnect = computed(() => {
  if (transportType.value === 'stdio') {
    return config.value.command.trim() !== '' && serverName.value.trim() !== '';
  } else {
    return config.value.url.trim() !== '' && serverName.value.trim() !== '';
  }
});

// 监听环境变量输入变化
watch(envVarsInput, (newValue) => {
  try {
    config.value.env = newValue ? JSON.parse(newValue) : {};
  } catch {
    // 忽略无效 JSON
  }
});

// 方法
const handleConnect = () => {
  if (!canConnect.value) return;
  
  const serverConfig = {
    name: serverName.value,
    type: transportType.value,
    command: transportType.value === 'stdio' ? config.value.command : undefined,
    url: transportType.value !== 'stdio' ? config.value.url : undefined,
    env: transportType.value === 'stdio' ? config.value.env : undefined
  };
  
  // 发送连接请求
  postMessage({
    type: 'connect',
    data: serverConfig
  });
};

const disconnect = () => {
  postMessage({
    type: 'disconnect'
  });
};

const loadConfig = (configToLoad: any) => {
  transportType.value = configToLoad.type;
  serverName.value = configToLoad.name;
  
  if (configToLoad.type === 'stdio') {
    config.value.command = configToLoad.command || '';
    config.value.env = configToLoad.env || {};
    envVarsInput.value = JSON.stringify(configToLoad.env || {}, null, 2);
  } else {
    config.value.url = configToLoad.url || '';
  }
};

const deleteConfig = (name: string) => {
  postMessage({
    type: 'deleteConfig',
    data: { name }
  });
};

// 通信函数
const postMessage = (message: any) => {
  if (typeof window !== 'undefined' && (window as any).vscode) {
    (window as any).vscode.postMessage(message);
  } else {
    console.log('Would send message:', message);
  }
};

// 监听来自扩展的消息
const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  switch (message.type) {
    case 'connectionStatusChanged':
      isConnected.value = message.data.connected;
      break;
    case 'configsUpdated':
      configs.value = message.data || [];
      break;
  }
};

// 生命周期
onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage);
    
    // 请求初始数据
    postMessage({ type: 'getConfigs' });
    postMessage({ type: 'getConnectionStatus' });
  }
});
</script>