<template>
  <div class="resources-tab h-full flex flex-col">
    <!-- 头部控制 -->
    <div class="flex-shrink-0 p-4 border-b border-vscode-panel-border">
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-medium text-vscode-foreground">Resources List</h3>
        <button
          @click="$emit('refresh')"
          :disabled="!isConnected || loading"
          class="btn-secondary text-xs disabled:opacity-50"
        >
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- 资源列表 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="text-center py-8 text-vscode-foreground opacity-75">
        Loading resources...
      </div>
      
      <div v-else-if="resources.length === 0 && resourceTemplates.length === 0" class="text-center py-8 text-vscode-foreground opacity-75">
        {{ isConnected ? 'No resources available' : 'Please connect to a server first' }}
      </div>
      
      <div v-else class="p-4">
        <!-- 资源模板 -->
        <div v-if="resourceTemplates.length > 0" class="mb-6">
          <h4 class="text-sm font-medium text-vscode-foreground mb-3 border-b border-vscode-panel-border pb-2">
            Resource Templates
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
                  <div class="text-xs text-vscode-foreground opacity-60 mb-2">
                    Template: {{ template.uriTemplate }}
                  </div>
                  
                  <!-- 显示资源模板内容 -->
                  <div v-if="resourceContent[getTemplateKey(template)]" class="mt-3">
                    <div class="text-xs text-vscode-foreground opacity-60 mb-2">Content:</div>
                    <div class="bg-vscode-editor-background rounded p-3 text-xs text-vscode-editor-foreground font-mono max-h-40 overflow-y-auto">
                      <pre>{{ formatResourceContent(resourceContent[getTemplateKey(template)]) }}</pre>
                    </div>
                  </div>
                </div>
                
                <div class="ml-3 flex flex-col space-y-2 flex-shrink-0">
                  <button
                    @click="handleReadTemplateClick(template)"
                    :disabled="!isConnected"
                    class="btn-primary text-sm disabled:opacity-50"
                  >
                    Read
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 常规资源 -->
        <div v-if="resources.length > 0">
          <h4 class="text-sm font-medium text-vscode-foreground mb-3 border-b border-vscode-panel-border pb-2">
            Resources
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
                    Type: {{ resource.mimeType }}
                  </div>
                  
                  <!-- 显示资源内容 -->
                  <div v-if="resourceContent[resource.uri]" class="mt-3">
                    <div class="text-xs text-vscode-foreground opacity-60 mb-2">Content:</div>
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
                    Read
                  </button>
                  <button
                    @click="subscribeResource(resource.uri)"
                    :disabled="!isConnected"
                    class="btn-secondary text-xs disabled:opacity-50"
                  >
                    Subscribe
                  </button>
                  <button
                    v-if="isSubscribed(resource.uri)"
                    @click="unsubscribeResource(resource.uri)"
                    :disabled="!isConnected"
                    class="btn-secondary text-xs disabled:opacity-50"
                  >
                    Unsubscribe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 参数输入模态框 -->
    <div v-if="showArgsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-vscode-panel-bg rounded-md p-6 w-11/12 max-w-2xl max-h-5/6 overflow-y-auto border border-vscode-panel-border">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-vscode-foreground">Read Resource: {{ selectedTemplate?.name || selectedTemplate?.uriTemplate }}</h3>
          <button @click="cancelArgsInput" class="text-vscode-foreground hover:text-red-400">
            ✕
          </button>
        </div>
        
        <div class="mb-4">
          <div class="text-sm text-vscode-foreground opacity-75 mb-3">
            URI Template: {{ selectedTemplate?.uriTemplate }}
          </div>
          
          <div class="space-y-3">
            <div v-for="key in Object.keys(templateArguments)" :key="key">
              <label class="block text-sm font-medium text-vscode-foreground mb-1">
                {{ key }}
              </label>
              <input
                v-model="templateArguments[key]"
                type="text"
                class="w-full bg-vscode-editor-background text-vscode-editor-foreground border border-vscode-panel-border rounded p-2 text-sm"
                :placeholder="`Enter ${key}`"
              />
            </div>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button @click="cancelArgsInput" class="btn-secondary">Cancel</button>
          <button @click="executeReadTemplate()" class="btn-primary">Read Resource</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

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
const showArgsModal = ref(false);
const selectedTemplate = ref<any>(null);
const templateArguments = reactive<Record<string, string>>({});

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

// 解析URI模板中的参数
const parseTemplateParams = (uriTemplate: string): string[] => {
  const paramRegex = /\{([^}]+)\}/g;
  const params: string[] = [];
  let match;
  
  while ((match = paramRegex.exec(uriTemplate)) !== null) {
    params.push(match[1]);
  }
  
  return params;
};

// 生成资源模板的key
const getTemplateKey = (template: any): string => {
  return `template:${template.uriTemplate}`;
};

// 处理资源模板读取点击
const handleReadTemplateClick = (template: any) => {
  console.log('[ResourcesTab] handleReadTemplateClick called');
  console.log('[ResourcesTab] template:', JSON.stringify(template, null, 2));
  
  selectedTemplate.value = template;
  
  // 重置参数
  Object.keys(templateArguments).forEach(key => {
    delete templateArguments[key];
  });
  
  // 解析URI模板中的参数
  const params = parseTemplateParams(template.uriTemplate);
  console.log('[ResourcesTab] parsed params:', params);
  
  // 如果有参数,显示参数输入框
  if (params.length > 0) {
    console.log('[ResourcesTab] Show parameter input');
    params.forEach(param => {
      templateArguments[param] = '';
    });
    showArgsModal.value = true;
    console.log('[ResourcesTab] showArgsModal set to true');
  } else {
    console.log('[ResourcesTab] No parameters, read resource directly');
    executeReadTemplate(template.uriTemplate);
  }
};

// 执行资源模板读取
const executeReadTemplate = (uriTemplate?: string) => {
  const template = uriTemplate || selectedTemplate.value?.uriTemplate;
  if (!template) return;
  
  console.log('[ResourcesTab] executeReadTemplate');
  console.log('[ResourcesTab] uriTemplate:', template);
  console.log('[ResourcesTab] templateArguments:', templateArguments);
  
  // 替换URI模板中的参数
  let finalUri = template;
  Object.entries(templateArguments).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      finalUri = finalUri.replace(`{${key}}`, value);
    }
  });
  
  console.log('[ResourcesTab] finalUri:', finalUri);
  
  // 发送读取资源请求
  emit('read-resource', finalUri);
  showArgsModal.value = false;
};

// 取消参数输入
const cancelArgsInput = () => {
  showArgsModal.value = false;
  selectedTemplate.value = null;
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