import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base:'./',
  build:{
    outDir:'../webview-dist',
    emptyOutDir:true,
    rollupOptions:{
      input:{
        main:path.resolve(__dirname, 'index.html'),
      },
      output:{
        entryFileNames:'assets/[name].js',
        chunkFileNames:'assets/[name].js',
        assetFileNames:'assets/[name].[ext]'
      }
    },
    minify:'terser',
    target:'es2022',
  },
  server:{
    port:3000,
    strictPort:true,
  }
})