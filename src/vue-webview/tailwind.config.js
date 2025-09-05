import { error, info, warn } from 'console';
import { text } from 'stream/consumers';

/** @type {import ('tailwindcss').Config} **/
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
        colors:{
            vscode:{
                background: 'var(--vscode-editor-background)',
                foreground: 'var(--vscode-foreground)',
                panel:{
                    bg: 'var(--vscode-panel-background)',
                    border: 'var(--vscode-panel-border)',
                },
                button:{
                    bg: 'var(--vscode-button-background)',
                    hover: 'var(--vscode-button-hoverBackground)',
                },
                input:{
                    bg: 'var(--vscode-input-background)',
                    border: 'var(--vscode-input-border)',
                    text: 'var(--vscode-input-foreground)',
                },
                sideBar:{
                    bg: 'var(--vscode-sideBar-background)',
                    hover: 'var(--vscode-sideBar-hoverBackground)',
                },
                error:'var(--vscode-errorForeground)',
                warning:'var(--vscode-warningForeground)',
                info:'var(--vscode-infoForeground)',
                success:'var(--vscode-successForeground)',
            }
        },
        fontFamily:{
            sans: ['var(--vscode-font-family)']
        }
    },
  },
  plugins: [],
}