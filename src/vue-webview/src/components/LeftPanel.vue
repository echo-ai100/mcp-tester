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
    </div>
</template>