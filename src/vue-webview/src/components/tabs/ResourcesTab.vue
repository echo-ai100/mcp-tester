<template>
  <div class="resources-tab h-full flex flex-col">
    <!-- 头部控制 -->
    <div class="flex-shrink-0 p-4 border-b border-vscode-panel-border">
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-medium text-vscode-foreground">资源列表</h3>
        <button
          @click="$emit('refresh')"
          :disabled="!isConnected || loading"
          class="btn-secondary text-xs disabled:opacity-50"
        >
          {{ loading ? '加载中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 资源列表 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="text-center py-8 text-vscode-foreground opacity-75">
        正在加载资源...
      </div>
      
      <div v-else-if="resources.length === 0 && resourceTemplates.length === 0" class="text-center py-8 text-vscode-foreground opacity-75">
        {{ isConnected ? '没有可用的资源' : '请先连接到服务器' }}
      </div>
      
      <div v-else class="p-4">
        <!-- 资源模板 -->
        <div v-if="resourceTemplates.length > 0" class="mb-6">
          <h4 class="text-sm font-medium text-vscode-foreground mb-3 border-b border-vscode-panel-border pb-2">
            资源模板
          </h4>
          <div class="space-y-3">
            <div
              v-for="template in resourceTemplates"
              :key="template.uriTemplate"
              class="bg-vscode-panel-bg border border-vscode-panel-border rounded-md p-4 hover:bg-opacity-80 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h5 class="text-vscode-foreground font-medium mb-1">{{ template.name || template.uriTemplate }}</h5>
                  <p v-if="template.description" class="text-vscode-foreground opacity-75 text-sm mb-2">
                    {{ template.description }}
                  </p>
                  <div class="text-xs text-vscode-foreground opacity-60">
                    模板: {{ template.uriTemplate }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 常规资源 -->
        <div v-if="resources.length > 0">
          <h4 class="text-sm font-medium text-vscode-foreground mb-3 border-b border-vscode-panel-border pb-2">
            资源
          </h4>
          <div class="space-y-3">
            <div
              v-for="resource in resources"
              :key="resource.uri"
              class="bg-vscode-panel-bg border border-vscode-panel-border rounded-md p-4 hover:bg-opacity-80 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h5 class="text-vscode-foreground font-medium mb-1">{{ resource.name || resource.uri }}</h5>
                  <p v-if="resource.description" class="text-vscode-foreground opacity-75 text-sm mb-2">
                    {{ resource.description }}
                  </p>
                  <div class="text-xs text-vscode-foreground opacity-60 mb-2">
                    URI: {{ resource.uri }}
                  </div>
                  <div v-if="resource.mimeType" class="text-xs text-vscode-foreground opacity-60 mb-2">
                    类型: {{ resource.mimeType }}
                  </div>
                  
                  <!-- 显示资源内容 -->
                  <div v-if="resourceContent[resource.uri]" class="mt-3">
                    <div class="text-xs text-vscode-foreground opacity-60 mb-2">内容:</div>
                    <div class="bg-vscode-editor-background rounded p-3 text-xs text-vscode-editor-foreground font-mono max-h-40 overflow-y-auto">
                      <pre>{{ formatResourceContent(resourceContent[resource.uri]) }}</pre>
                    </div>
                  </div>
                </div>
                
                <div class="ml-3 flex flex-col space-y-2 flex-shrink-0">
                  <button
                    @click="readResource(resource.uri)"
                    :disabled="!isConnected"
                    class="btn-primary text-sm disabled:opacity-50"
                  >
                    读取
                  </button>
                  <button
                    @click="subscribeResource(resource.uri)"
                    :disabled="!isConnected"
                    class="btn-secondary text-xs disabled:opacity-50"
                  >
                    订阅
                  </button>
                  <button
                    v-if="isSubscribed(resource.uri)"
                    @click="unsubscribeResource(resource.uri)"
                    :disabled="!isConnected"
                    class="btn-secondary text-xs disabled:opacity-50"
                  >
                    取消订阅
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Props
interface Props {
  resources: any[];
  resourceTemplates: any[];
  resourceContent: Record<string, any>;
  isConnected: boolean;
  loading: boolean;
}

defineProps<Props>();

// Emits
const emit = defineEmits<{
  refresh: [];
  'read-resource': [uri: string];
  'subscribe-resource': [uri: string];
  'unsubscribe-resource': [uri: string];
}>();

// 状态
const subscribedResources = ref<Set<string>>(new Set());

// 方法
const readResource = (uri: string) => {
  emit('read-resource', uri);
};

const subscribeResource = (uri: string) => {
  subscribedResources.value.add(uri);
  emit('subscribe-resource', uri);
};

const unsubscribeResource = (uri: string) => {
  subscribedResources.value.delete(uri);
  emit('unsubscribe-resource', uri);
};

const isSubscribed = (uri: string): boolean => {
  return subscribedResources.value.has(uri);
};

const formatResourceContent = (content: any): string => {
  if (!content) return '';
  
  if (typeof content === 'string') {
    return content;
  }
  
  if (content.contents && Array.isArray(content.contents)) {
    return content.contents.map((item: any) => {
      if (item.type === 'text') {
        return item.text;
      } else if (item.type === 'resource') {
        return `[Resource: ${item.resource?.uri || 'Unknown'}]`;
      }
      return JSON.stringify(item, null, 2);
    }).join('\n\n');
  }
  
  return JSON.stringify(content, null, 2);
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