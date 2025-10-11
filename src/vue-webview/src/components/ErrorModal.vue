<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click="closeModal"
  >
    <div
      class="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-96 overflow-y-auto"
      @click.stop
    >
      <!-- 头部 -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center">
          <div :class="getIconClasses()" class="w-6 h-6 mr-3 flex-shrink-0">
            {{ getIcon() }}
          </div>
          <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
        </div>
        <button
          @click="closeModal"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 内容 -->
      <div class="mb-6">
        <p class="text-gray-300 mb-4">{{ message }}</p>
        
        <!-- 错误详情 -->
        <div v-if="error && showDetails" class="mt-4">
          <div class="text-sm text-gray-400 mb-2">Error Details:</div>
          <div class="bg-gray-900 rounded p-3 text-xs text-red-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
            {{ formatError(error) }}
          </div>
        </div>
        
        <!-- 切换详情按钮 -->
        <button
          v-if="error"
          @click="showDetails = !showDetails"
          class="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {{ showDetails ? 'Hide Details' : 'Show Details' }}
        </button>
      </div>

      <!-- 底部按钮 -->
      <div class="flex justify-end space-x-3">
        <button
          v-if="showCancel"
          @click="cancelAction"
          class="btn-secondary"
        >
          {{ cancelText }}
        </button>
        <button
          @click="confirmAction"
          :class="getConfirmButtonClasses()"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  visible?: boolean;
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message?: string;
  error?: Error | string | any;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  type: 'error',
  title: 'Error',
  message: 'An error occurred',
  showCancel: false,
  confirmText: 'OK',
  cancelText: 'Cancel'
});

const emit = defineEmits<{
  close: [];
  confirm: [];
  cancel: [];
}>();

const showDetails = ref(false);

// 获取图标
const getIcon = () => {
  const icons = {
    error: '⚠️',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅'
  };
  return icons[props.type] || icons.error;
};

// 获取图标样式
const getIconClasses = () => {
  const classes = {
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
    success: 'text-green-400'
  };
  return classes[props.type] || classes.error;
};

// 获取确认按钮样式
const getConfirmButtonClasses = () => {
  const classes = {
    error: 'btn-danger',
    warning: 'btn-warning',
    info: 'btn-primary',
    success: 'btn-success'
  };
  return classes[props.type] || 'btn-primary';
};

// 格式化错误信息
const formatError = (error: any) => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n\n${error.stack || 'No stack trace available'}`;
  } else if (typeof error === 'object') {
    return JSON.stringify(error, null, 2);
  } else {
    return String(error);
  }
};

// 方法
const closeModal = () => {
  emit('close');
};

const confirmAction = () => {
  emit('confirm');
  closeModal();
};

const cancelAction = () => {
  emit('cancel');
  closeModal();
};
</script>

<style scoped>
.btn-danger {
  @apply bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors;
}

.btn-warning {
  @apply bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded transition-colors;
}

.btn-success {
  @apply bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors;
}
</style>