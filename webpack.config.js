// 引入 Node.js 的 path 模块，用于处理文件路径
const path = require('path');

// 导出 webpack 配置对象
module.exports = {
    // 指定构建环境为目标 Node.js，避免将 Node.js 内置模块打包进 bundle
    target: 'node',
    
    // 设置构建模式为 'none'，不启用任何默认优化（如压缩等）
    mode: 'none',
    
    // 指定入口文件路径，Webpack 会从此文件开始构建依赖图
    entry: './src/extension.ts',
    
    // 配置输出设置
    output: {
        // 指定输出目录的绝对路径，使用 path.resolve 将 __dirname 和 'out' 合并为绝对路径
        path: path.resolve(__dirname, 'out'),
        // 指定输出文件名
        filename: 'extension.js',
        // 指定模块导出方式，commonjs2 用于 Node.js 环境
        libraryTarget: 'commonjs2'
    },
    
    // 指定外部依赖，这些依赖不会被打包进最终的 bundle 中
    externals: {
        // 将 vscode 模块视为外部依赖，使用 commonjs 方式引入
        vscode: 'commonjs vscode'
    },
    
    // 配置模块解析规则
    resolve: {
        // 指定可以省略的文件扩展名，在导入时可以不写这些扩展名
        extensions: ['.ts', '.js']
    },
    
    // 配置模块规则
    module: {
        // 定义模块规则列表
        rules: [
            {
                // 匹配所有以 .ts 结尾的文件
                test: /\.ts$/,
                // 排除 node_modules 和 src/vue-webview 目录
                exclude: [/node_modules/,/src\/vue-webview/],
                // 指定使用的加载器
                use: [
                    {
                        // 使用 ts-loader 处理 TypeScript 文件
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },
    
    // 指定 source map 类型，'source-map' 会创建外部 source map 文件
    devtool: 'source-map',
    
    // 配置基础设施日志级别
    infrastructureLogging:{
        // 设置日志级别为 'log'
        level:'log'
    }
};