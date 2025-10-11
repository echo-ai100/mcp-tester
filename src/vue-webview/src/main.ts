import { createApp } from 'vue';
import { createPinia } from 'pinia';
import MainApp from './components/MainApp.vue';
import './assets/styles/main.css';

const app = createApp(MainApp);
app.use(createPinia());
app.mount('#app');

// 全局错误处理
app.config.errorHandler = (err, _vm, info) => {
    console.error('Vue Error:', err, info);
};

// VSCode API 类型声明
declare global {
    interface Window {
        acquireVsCodeApi?: () => any;
    }
}

// 为 VSCode webview 环境进行特殊处理
if (typeof window !== 'undefined' && window.acquireVsCodeApi) {
    const vscode = window.acquireVsCodeApi();
    app.config.globalProperties.$vscode = vscode;
    
    // 全局通信方法
    app.config.globalProperties.$postMessage = (message: any) => {
        vscode.postMessage(message);
    };
    
    // 全局状态恢复
    const state = vscode.getState();
    if (state) {
        console.log('恢复状态:', state);
    }
}