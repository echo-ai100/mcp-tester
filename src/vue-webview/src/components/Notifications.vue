<template>
  <div
    v-if="notifications.length > 0"
    class="fixed top-4 right-4 z-50 space-y-2"
  >
    <div
      v-for="notification in notifications"
      :key="notification.id"
      :class="[
        'p-4 rounded-lg shadow-lg border max-w-sm transition-all duration-300',
        getNotificationClasses(notification.type)
      ]"
    >
      <div class="flex items-start">
        <div class="flex-1">
          <div class="font-medium">{{ notification.title }}</div>
          <div v-if="notification.message" class="text-sm opacity-90 mt-1">
            {{ notification.message }}
          </div>
        </div>
        <button
          @click="removeNotification(notification.id)"
          class="ml-3 text-current opacity-60 hover:opacity-100"
        >
          ×
        </button>
      </div>
      
      <!-- 自动消失进度条 -->
      <div
        v-if="notification.autoHide"
        class="mt-2 h-1 bg-current opacity-20 rounded overflow-hidden"
      >
        <div
          class="h-full bg-current transition-all ease-linear"
          :style="{ width: getProgressWidth(notification) + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  autoHide?: boolean;
  duration?: number;
  createdAt: number;
}

const notifications = ref<Notification[]>([]);

// 通知样式
const getNotificationClasses = (type: string) => {
  const classes = {
    success: 'bg-green-900 border-green-700 text-green-100',
    error: 'bg-red-900 border-red-700 text-red-100',
    warning: 'bg-yellow-900 border-yellow-700 text-yellow-100',
    info: 'bg-blue-900 border-blue-700 text-blue-100'
  };
  return classes[type as keyof typeof classes] || classes.info;
};

// 获取进度条宽度
const getProgressWidth = (notification: Notification) => {
  if (!notification.autoHide || !notification.duration) return 0;
  
  const elapsed = Date.now() - notification.createdAt;
  const progress = Math.max(0, 100 - (elapsed / notification.duration) * 100);
  return progress;
};

// 添加通知
const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
  const newNotification: Notification = {
    ...notification,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: Date.now(),
    duration: notification.duration || 5000
  };
  
  notifications.value.push(newNotification);
  
  // 自动移除
  if (newNotification.autoHide !== false) {
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, newNotification.duration);
  }
};

// 移除通知
const removeNotification = (id: string) => {
  const index = notifications.value.findIndex(n => n.id === id);
  if (index > -1) {
    notifications.value.splice(index, 1);
  }
};

// 清空所有通知
const clearNotifications = () => {
  notifications.value = [];
};

// 监听来自扩展的消息
const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  if (message.type === 'notification') {
    addNotification(message.data);
  } else if (message.type === 'clearNotifications') {
    clearNotifications();
  }
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('message', handleMessage);
  }
});

// 暴露方法给父组件
defineExpose({
  addNotification,
  removeNotification,
  clearNotifications
});
</script>