#!/bin/bash

# 验证 MCP Tester VSCode 扩展打包结果

echo "🔍 验证 MCP Tester VSCode 扩展打包..."

# 检查关键文件是否存在
if [ -f "mcp-tester-0.0.1.vsix" ]; then
    echo "✅ VSIX 安装包已生成: mcp-tester-0.0.1.vsix"
    echo "📦 文件大小: $(ls -lh mcp-tester-0.0.1.vsix | awk '{print $5}')"
else
    echo "❌ VSIX 安装包未找到"
    exit 1
fi

# 检查必要的 WebView 资源
echo ""
echo "🔍 检查 WebView 资源文件..."

if [ -f "src/webview-dist/assets/main.css" ]; then
    echo "✅ CSS 文件存在: src/webview-dist/assets/main.css"
else
    echo "❌ CSS 文件缺失"
    exit 1
fi

if [ -f "src/webview-dist/assets/main.js" ]; then
    echo "✅ JavaScript 文件存在: src/webview-dist/assets/main.js"
else
    echo "❌ JavaScript 文件缺失"
    exit 1
fi

# 检查编译输出
echo ""
echo "🔍 检查扩展编译输出..."

if [ -f "out/extension.js" ]; then
    echo "✅ 扩展主文件已编译: out/extension.js"
    echo "📄 文件大小: $(ls -lh out/extension.js | awk '{print $5}')"
else
    echo "❌ 扩展主文件缺失"
    exit 1
fi

# 验证打包内容
echo ""
echo "🔍 验证 VSIX 包内容..."

# 检查 WebView 资源是否包含在包中
if command -v npx &> /dev/null; then
    WEBVIEW_FILES=$(npx @vscode/vsce ls | grep "webview-dist" | wc -l)
    if [ $WEBVIEW_FILES -ge 3 ]; then
        echo "✅ WebView 资源文件已包含在 VSIX 包中 ($WEBVIEW_FILES 个文件)"
    else
        echo "⚠️  WebView 资源文件可能缺失 (仅发现 $WEBVIEW_FILES 个文件)"
    fi
else
    echo "⚠️  无法验证 VSIX 包内容 (缺少 @vscode/vsce)"
fi

echo ""
echo "🎉 打包验证完成！"
echo ""
echo "📋 安装说明:"
echo "1. 打开 VSCode"
echo "2. 按 Ctrl+Shift+P 打开命令面板"
echo "3. 输入 'Extensions: Install from VSIX...'"
echo "4. 选择 'mcp-tester-0.0.1.vsix' 文件"
echo "5. 重启 VSCode"
echo ""
echo "🔧 如果遇到 WebView 资源加载问题:"
echo "- 确保 VSCode 版本 >= 1.74.0"
echo "- 检查开发者控制台错误信息"
echo "- 尝试重新加载窗口 (Ctrl+Shift+P -> 'Developer: Reload Window')"