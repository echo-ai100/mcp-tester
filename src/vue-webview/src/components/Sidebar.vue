<template>
  <div class="sidebar bg-vscode-panel-bg border-r border-vscode-panel-border flex flex-col h-full">
    <!-- 顶部导航 -->
    <div class="p-4 border-b border-vscode-panel-border">
      <h2 class="text-lg font-semibold text-vscode-foreground">MCP Tester</h2>
      <div class="mt-2 flex items-center text-sm">
        <span class="w-2 h-2 rounded-full mr-2" :class="connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'"></span>
        <span :class="connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'">
          {{ connectionStatus === 'connected' ? '已连接' : '未连接' }}
        </span>
      </div>
    </div>
    
    <!-- 连接配置面板 -->
    <div class="flex-1 overflow-y-auto p-4">
      <LeftPanel 
        :connection-status="connectionStatus"
        :server-capabilities="serverCapabilities"
        :saved-servers="savedServers"
        @connect="$emit('connect', $event)"
        @disconnect="$emit('disconnect')"
        @load-server="$emit('load-server', $event)"
        @delete-server="$emit('delete-server', $event)"
        @open-tools-panel="$emit('open-tools-panel')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import LeftPanel from './LeftPanel.vue';

// Props
interface Props {
  connectionStatus: string;
  serverCapabilities: Record<string, any>;
  savedServers: any[];
}

defineProps<Props>();

// Emits
defineEmits<{
  connect: [config: any];
  disconnect: [];
  'load-server': [name: string];
  'delete-server': [name: string];
  'open-tools-panel': [];
}>();
</script>

<style scoped>
.sidebar {
  width: 300px;
  min-width: 300px;
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
</style>