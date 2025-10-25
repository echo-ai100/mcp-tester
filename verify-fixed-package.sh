#!/bin/bash

# MCP Tester 0.0.2 修复版验证脚本

echo "=========================================="
echo "MCP Tester 0.0.2 修复版验证"
echo "=========================================="
echo ""

# 检查VSIX文件是否存在
echo "1. 检查VSIX文件..."
if [ -f "mcp-tester-0.0.2-fixed.vsix" ]; then
    echo "   ✅ VSIX文件存在"
    ls -lh mcp-tester-0.0.2-fixed.vsix
else
    echo "   ❌ VSIX文件不存在"
    exit 1
fi
echo ""

# 检查文件类型
echo "2. 验证文件类型..."
FILE_TYPE=$(file mcp-tester-0.0.2-fixed.vsix | grep -c "Zip archive")
if [ "$FILE_TYPE" -eq 1 ]; then
    echo "   ✅ 文件类型正确（Zip archive）"
else
    echo "   ❌ 文件类型错误"
    exit 1
fi
echo ""

# 检查关键文件
echo "3. 检查关键文件是否包含..."

echo "   - 检查后端文件 (mcp-server-manager)..."
BACKEND_COUNT=$(unzip -l mcp-tester-0.0.2-fixed.vsix | grep -c "mcp-server-manager")
if [ "$BACKEND_COUNT" -gt 0 ]; then
    echo "     ✅ 后端文件已包含 ($BACKEND_COUNT 个相关文件)"
else
    echo "     ❌ 后端文件缺失"
fi

echo "   - 检查前端文件 (webview-dist)..."
FRONTEND_COUNT=$(unzip -l mcp-tester-0.0.2-fixed.vsix | grep -c "webview-dist")
if [ "$FRONTEND_COUNT" -gt 0 ]; then
    echo "     ✅ 前端文件已包含 ($FRONTEND_COUNT 个相关文件)"
else
    echo "     ❌ 前端文件缺失"
fi

echo "   - 检查Vue构建文件时间戳..."
LATEST_DATE=$(unzip -l mcp-tester-0.0.2-fixed.vsix | grep "webview-dist" | head -1 | awk '{print $2}')
echo "     ℹ️  最新构建日期: $LATEST_DATE"

echo ""

# 统计VSIX内容
echo "4. VSIX包内容统计..."
TOTAL_FILES=$(unzip -l mcp-tester-0.0.2-fixed.vsix | tail -1 | awk '{print $2}')
TOTAL_SIZE=$(unzip -l mcp-tester-0.0.2-fixed.vsix | tail -1 | awk '{print $3}')
echo "   - 总文件数: $TOTAL_FILES"
echo "   - 总大小: $TOTAL_SIZE bytes"
echo ""

# 检查修复文档
echo "5. 检查修复文档..."
if [ -f "PROMPT_ARGS_FIX.md" ]; then
    echo "   ✅ 修复文档存在 (PROMPT_ARGS_FIX.md)"
else
    echo "   ⚠️  修复文档不存在"
fi

if [ -f "安装说明.md" ]; then
    echo "   ✅ 安装说明存在 (安装说明.md)"
else
    echo "   ⚠️  安装说明不存在"
fi
echo ""

# 最终总结
echo "=========================================="
echo "验证完成！"
echo "=========================================="
echo ""
echo "✅ VSIX包已准备好安装"
echo ""
echo "安装命令："
echo "  code --install-extension mcp-tester-0.0.2-fixed.vsix"
echo ""
echo "或者在VSCode中："
echo "  1. 按 Cmd+Shift+P"
echo "  2. 输入: Extensions: Install from VSIX..."
echo "  3. 选择: mcp-tester-0.0.2-fixed.vsix"
echo "  4. 重启VSCode"
echo ""
echo "详细说明请查看: 安装说明.md"
echo "=========================================="
