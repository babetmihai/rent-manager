import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))


export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, "..")
  const { FIREBASE_CONFIG } = loadEnv(mode, repoRoot, "")
  if (!FIREBASE_CONFIG) {
    throw new Error("FIREBASE_CONFIG is required in .env")
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(path.resolve(repoRoot, FIREBASE_CONFIG), "utf8"))

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    base: mode === "hosting" ? "/" : "./",
    root: __dirname,
    envDir: repoRoot,
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true
    },
    resolve: {
      alias: {
        "app": path.resolve(__dirname, "./src")
      }
    },
    define: {
      __FIREBASE_CONFIG__: JSON.stringify(firebaseConfig)
    },
    server: {
      port: 5173,
      proxy: {
        "/ticker": {
          target: "http://127.0.0.1:3002",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ticker/, "")
        }
      }
    }
  }
})
