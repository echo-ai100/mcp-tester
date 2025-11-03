# MCP Tester

A full-featured VSCode extension for testing and debugging Model Context Protocol (MCP) servers. This extension provides the same functionality as the official MCP Inspector, supporting multiple transport protocols with an intuitive interface for MCP server management and interaction.

## 🚀 Core Features

### 📡 Multi-Protocol Support
- **STDIO Transport**: Support for local command-line MCP servers
- **SSE (Server-Sent Events)**: HTTP streaming event-based connections  
- **Streamable HTTP**: HTTP streaming transport protocol
- **Custom Headers**: Authentication and custom HTTP headers support

### 🛠️ Complete MCP Functionality
- **Tools Management**: List, view, and invoke MCP tools
- **Resources Management**: Browse, read, and subscribe to MCP resources
- **Prompts Management**: Manage and use MCP prompt templates
- **Roots Management**: View and manage server root directories
- **Real-time Notifications**: Receive server notifications and status updates

### 🎯 Advanced Features
- **Visual Interface**: Modern WebView UI built with Vue.js
- **Configuration Management**: Save and manage multiple server configurations
- **Request History**: Complete request/response history tracking
- **Error Handling**: Comprehensive error handling and user feedback
- **Status Monitoring**: Real-time connection status and server capabilities display
- **Sampling Support**: MCP sampling request and response support
- **Completion Support**: Parameter auto-completion support

### 🔧 Developer Tools
- **Command Palette Integration**: All features accessible via VSCode command palette
- **Status Bar Display**: Real-time connection status display
- **Config Import/Export**: MCP server configuration import/export support
- **Log Management**: Support for setting log levels and viewing logs
- **Ping Testing**: Test server connection and response

## 📦 Installation

### Build from Source

1. **Clone the repository**:
```bash
git clone https://github.com/echo-ai100/mcp-tester.git
cd mcp-tester
```

2. **Install main project dependencies**:
```bash
npm install
```

3. **Install Vue webview dependencies**:
```bash
npm run install-webview
```

4. **Build the project**:
```bash
cd ./src/vue-webview && npm run build
cd ../../ && npm run build
```

5. **Build the .vsix file**:
```bash
npx vsce package
```

### Install from VSIX

1. Download the latest `.vsix` file from releases
2. Open VSCode
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
4. Type "Extensions: Install from VSIX..."
5. Select the downloaded `.vsix` file
6. Reload VSCode when prompted

## 🎮 Usage

### 1. Launch MCP Tester

#### Via Command Palette:
- Open command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- Type "MCP: Open MCP Tester"

#### Via Activity Bar:
- Click the MCP Tester icon in the left activity bar

#### Via Status Bar:
- Click the MCP connection status in the bottom status bar

### 2. Connect to MCP Server

#### STDIO Transport (Recommended for local development)
For local command-line MCP servers:

```json
{
  "type": "stdio",
  "command": "node",
  "args": ["path/to/your/mcp-server.js"],
  "env": {
    "API_KEY": "your-api-key",
    "DEBUG": "true"
  }
}
```

**Example Configuration**:
```json
{
  "type": "stdio",
  "command": "npx",
  "args": ["@modelcontextprotocol/server-everything"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

#### SSE (Server-Sent Events) Transport
For HTTP streaming transport:

```json
{
  "type": "sse",
  "url": "http://localhost:3000/sse",
  "customHeaders": {
    "Authorization": "Bearer your-token",
    "X-API-Key": "your-api-key"
  }
}
```

#### Streamable HTTP Transport
For HTTP streaming transport:

```json
{
  "type": "streamable-http",
  "url": "http://localhost:3000/mcp",
  "customHeaders": {
    "Authorization": "Bearer your-token"
  }
}
```

### 3. Use MCP Features

Once connected, you can:

#### 🛠️ Tools
- **List Tools**: View all tools provided by the server
- **View Tool Details**: Check tool input/output schemas
- **Invoke Tools**: Call tools using form or JSON format
- **View Results**: See tool execution results and error messages

#### 📄 Resources
- **Browse Resources**: View available resource list
- **Read Resources**: Get resource content
- **Subscribe Resources**: Subscribe to resource change notifications
- **Resource Templates**: Use parameterized resource templates

#### 💬 Prompts
- **Manage Prompts**: View and use predefined prompts
- **Parameter Filling**: Provide parameters for prompts
- **Get Results**: Retrieve generated prompt content

#### 📁 Roots
- **View Roots**: List server root directories
- **Directory Management**: Manage server filesystem access

#### 🔔 Real-time Features
- **Server Notifications**: Receive real-time server notifications
- **Connection Status**: Monitor connection status changes
- **Request History**: View complete request/response history

## ⚙️ Configuration Options

### VSCode Settings

Configure `mcp-tester` options in VSCode settings:

| Configuration | Type | Default | Description |
|--------------|------|---------|-------------|
| `mcp-tester.autoStart` | boolean | true | Auto-start on VSCode launch |
| `mcp-tester.defaultTransport` | string | "stdio" | Default transport protocol |
| `mcp-tester.timeout` | number | 30000 | Request timeout (milliseconds) |
| `mcp-tester.maxHistory` | number | 100 | Maximum history entries |
| `mcp-tester.enableLogging` | boolean | false | Enable logging |
| `mcp-tester.maxRetryAttempts` | number | 3 | Maximum retry attempts |
| `mcp-tester.retryDelay` | number | 1000 | Retry delay (milliseconds) |

### Server Configuration

Configure the `mcp-tester.servers` array in settings to predefine servers:

```json
{
  "mcp-tester.servers": [
    {
      "name": "Everything Server",
      "type": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-everything"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Remote API Server",
      "type": "sse",
      "url": "https://api.example.com/mcp/sse",
      "customHeaders": {
        "Authorization": "Bearer your-token"
      }
    },
    {
      "name": "Local HTTP Server",
      "type": "streamable-http",
      "url": "http://localhost:8080/mcp"
    }
  ]
}
```

## 🎛️ Command Palette Commands

| Command | Description |
|---------|-------------|
| `MCP: Open MCP Tester` | Open MCP Tester main interface |
| `MCP: Connect to MCP Server` | Connect to MCP server |
| `MCP: Disconnect from MCP Server` | Disconnect from server |
| `MCP: List Tools` | Display tools list in editor |
| `MCP: List Resources` | Display resources list in editor |
| `MCP: List Prompts` | Display prompts list in editor |
| `MCP: Ping Server` | Test server connection |
| `MCP: Show Connection Status` | Show connection status information |
| `MCP: Clear Request History` | Clear request history |
| `MCP: Export Server Configuration` | Export server configuration |
| `MCP: Import Server Configuration` | Import server configuration |

## 🏗️ Project Architecture

```
mcp-tester/
├── src/
│   ├── extension.ts              # VSCode extension entry point
│   ├── mcp-tester-provider.ts    # WebView provider for UI interaction
│   ├── server/
│   │   └── mcp-server-manager.ts # MCP server manager for protocol communication
│   └── vue-webview/             # Vue.js frontend interface
│       ├── src/
│       │   ├── components/      # Vue components
│       │   │   ├── MainApp.vue  # Main application component
│       │   │   ├── Sidebar.vue  # Sidebar component
│       │   │   ├── ToolsPanel.vue # Tools panel component
│       │   │   └── ...          # Other feature components
│       │   ├── assets/styles/   # Style files
│       │   └── main.ts         # Vue application entry
│       ├── package.json
│       └── vite.config.ts
├── package.json                 # Extension configuration and dependencies
├── webpack.config.js           # Webpack build configuration
└── tsconfig.json              # TypeScript configuration
```

### Architecture Features

1. **Layered Architecture**: 
   - **Extension Layer**: VSCode extension API integration
   - **Business Layer**: MCP protocol handling and state management
   - **Presentation Layer**: Vue.js WebView interface

2. **Event-Driven**: 
   - Use EventEmitter for inter-component communication
   - Support real-time status updates and notifications

3. **Modular Design**: 
   - Independent server manager module
   - Reusable Vue components
   - Clear separation of responsibilities

## 🔧 Development Guide

### Development Environment Requirements

- **Node.js**: >= 16.x
- **npm**: >= 7.x
- **VSCode**: >= 1.74.0
- **TypeScript**: >= 4.9.x

### Development Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile TypeScript and build Vue app |
| `npm run watch` | Watch mode compilation |
| `npm run build` | Complete project build |
| `npm run dev-webview` | Run Vue app in development mode |
| `npm run build-webview` | Build Vue app |
| `npm run install-webview` | Install Vue app dependencies |
| `npm run lint` | Code linting |
| `npm run package` | Production build |

### Vue WebView Development

The Vue frontend interface is located in the `src/vue-webview/` directory:

```bash
# Navigate to Vue project directory
cd src/vue-webview

# Install dependencies
npm install

# Development mode
npm run dev

# Build production version
npm run build
```

### Adding New Features

1. **Add New MCP Protocol Feature**:
   - Add new method in `MCPServerManager`
   - Add message handling in `MCPTesterProvider`
   - Add UI interaction in Vue components

2. **Add New Vue Component**:
   - Create component in `src/vue-webview/src/components/`
   - Import and use in `MainApp.vue`
   - Add corresponding styles and interaction logic

3. **Add New VSCode Command**:
   - Declare in `package.json`'s `contributes.commands`
   - Register command handler in `extension.ts`

## 🧪 Testing

### Unit Tests

```bash
# Run tests
npm test

# Watch mode testing
npm run test:watch
```

### Integration Tests

1. **Test STDIO Transport**:
```bash
# Use official example server
npx @modelcontextprotocol/server-everything
```

2. **Test HTTP Transport**:
```bash
# Start HTTP MCP server
# Then connect to the corresponding URL in the extension
```

### Debugging Tips

1. **Enable Verbose Logging**:
   - Enable `mcp-tester.enableLogging` in settings
   - Check VSCode developer console output

2. **Vue DevTools**:
   - Can use Vue DevTools in development mode
   - WebView debugging requires enabling developer mode

3. **Network Debugging**:
   - Use browser developer tools to monitor HTTP requests
   - Check WebSocket connection status

## 🤝 Contributing

### Code Submission

1. Fork the project
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add some amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards

- **TypeScript**: Use strict mode with complete type annotations
- **Vue**: Use Composition API and `<script setup>` syntax
- **Styles**: Use VSCode theme variables for consistency
- **Comments**: Provide clear comments for important logic

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types include:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code formatting
- `refactor`: Code refactoring
- `test`: Test related
- `chore`: Build or tool changes

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Model Context Protocol (MCP) team for the protocol specification
- VSCode team for the excellent extension API
- Vue.js team for the reactive framework
- All contributors who have helped improve this project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/mcp-tester/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/mcp-tester/discussions)
- **Email**: support@example.com

---

**Developer**: Echo AI  
**Version**: 0.0.2  
**Last Updated**: November 2024
