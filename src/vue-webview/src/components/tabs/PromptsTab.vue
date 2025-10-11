<template>
  <div class="prompts-tab h-full flex flex-col">
    <!-- 头部控制 -->
    <div class="flex-shrink-0 p-4 border-b border-vscode-panel-border">
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-medium text-vscode-foreground">提示词列表</h3>
        <button
          @click="$emit('refresh')"
          :disabled="!isConnected || loading"
          class="btn-secondary text-xs disabled:opacity-50"
        >
          {{ loading ? '加载中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 提示词列表 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="text-center py-8 text-vscode-foreground opacity-75">
        正在加载提示词...
      </div>
      
      <div v-else-if="prompts.length === 0" class="text-center py-8 text-vscode-foreground opacity-75">
        {{ isConnected ? '没有可用的提示词' : '请先连接到服务器' }}
      </div>
      
      <div v-else class="p-4 space-y-3">
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
              
              <!-- 参数信息 -->
              <div v-if="prompt.arguments && prompt.arguments.length > 0" class="mb-3">
                <div class="text-xs text-vscode-foreground opacity-60 mb-2">参数:</div>
                <div class="bg-vscode-editor-background rounded p-2 text-xs text-vscode-editor-foreground font-mono">
                  <div v-for="arg in prompt.arguments" :key="arg.name" class="mb-1">
                    <span class="text-blue-300">{{ arg.name }}</span>
                    <span v-if="arg.required" class="text-red-300 ml-1">*</span>
                    <span v-if="arg.description" class="text-gray-500 ml-2">// {{ arg.description }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 显示提示词内容 -->
              <div v-if="promptContent && showingPrompt === prompt.name" class="mt-3">
                <div class="text-xs text-vscode-foreground opacity-60 mb-2">生成的提示词:</div>
                <div class="bg-vscode-editor-background rounded p-3 text-sm text-vscode-editor-foreground max-h-60 overflow-y-auto">
                  <div v-if="promptContent.messages && promptContent.messages.length > 0">
                    <div v-for="(message, index) in promptContent.messages" :key="index" class="mb-3 last:mb-0">
                      <div class="text-xs text-blue-300 mb-1">{{ message.role }}:</div>
                      <div class="pl-2 border-l-2 border-blue-500">
                        <div v-if="message.content.type === 'text'" class="whitespace-pre-wrap">
                          {{ message.content.text }}
                        </div>
                        <div v-else>
                          <pre>{{ JSON.stringify(message.content, null, 2) }}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <pre>{{ JSON.stringify(promptContent, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              @click="getPrompt(prompt)"
              :disabled="!isConnected"
              class="ml-3 btn-primary text-sm disabled:opacity-50 flex-shrink-0"
            >
              获取
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示词参数模态框 -->
    <div v-if="showArgsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-vscode-panel-bg rounded-md p-6 w-11/12 max-w-2xl max-h-5/6 overflow-y-auto border border-vscode-panel-border">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-vscode-foreground">获取提示词: {{ selectedPrompt?.name }}</h3>
          <button @click="showArgsModal = false" class="text-vscode-foreground hover:text-red-400">
            ✕
          </button>
        </div>
        
        <div v-if="selectedPrompt && selectedPrompt.arguments && selectedPrompt.arguments.length > 0" class="space-y-4 mb-6">
          <div v-for="arg in selectedPrompt.arguments" :key="arg.name">
            <label class="block text-sm font-medium text-vscode-foreground mb-1">
              {{ arg.name }}
              <span v-if="arg.required" class="text-red-400">*</span>
            </label>
            <input
              v-model="promptArguments[arg.name]"
              type="text"
              :placeholder="arg.description || `请输入 ${arg.name}`"
              class="w-full bg-vscode-editor-background text-vscode-editor-foreground border border-vscode-panel-border rounded p-2 text-sm"
            />
            <div v-if="arg.description" class="text-xs text-vscode-foreground opacity-60 mt-1">
              {{ arg.description }}
            </div>
          </div>
        </div>
        
        <div v-else class="mb-6 text-vscode-foreground opacity-75">
          此提示词不需要参数
        </div>
        
        <div class="flex justify-end space-x-3">
          <button @click="showArgsModal = false" class="btn-secondary">取消</button>
          <button @click="executeGetPrompt" :disabled="executing" class="btn-primary">
            {{ executing ? '获取中...' : '获取提示词' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

// Props
interface Props {
  prompts: any[];
  promptContent: any;
  isConnected: boolean;
  loading: boolean;
}

defineProps<Props>();

// Emits
const emit = defineEmits<{
  refresh: [];
  'get-prompt': [name: string, args: Record<string, string>];
}>();

// 状态
const showArgsModal = ref(false);
const selectedPrompt = ref<any>(null);
const promptArguments = reactive<Record<string, string>>({});
const executing = ref(false);
const showingPrompt = ref<string | null>(null);

// 方法
const getPrompt = (prompt: any) => {
  selectedPrompt.value = prompt;
  
  // 重置参数
  Object.keys(promptArguments).forEach(key => {
    delete promptArguments[key];
  });
  
  // 如果有参数，显示参数输入框
  if (prompt.arguments && prompt.arguments.length > 0) {
    // 初始化参数
    prompt.arguments.forEach((arg: any) => {
      promptArguments[arg.name] = '';
    });
    showArgsModal.value = true;
  } else {
    // 直接获取提示词
    executeGetPrompt();
  }
};

const executeGetPrompt = async () => {
  if (!selectedPrompt.value) return;
  
  executing.value = true;
  try {
    // 验证必需参数
    if (selectedPrompt.value.arguments) {
      for (const arg of selectedPrompt.value.arguments) {
        if (arg.required && !promptArguments[arg.name]) {
          alert(`参数 "${arg.name}" 是必需的`);
          return;
        }
      }
    }
    
    emit('get-prompt', selectedPrompt.value.name, { ...promptArguments });
    showingPrompt.value = selectedPrompt.value.name;
    showArgsModal.value = false;
  } catch (error) {
    console.error('获取提示词失败:', error);
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