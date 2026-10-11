import { fileURLToPath } from 'node:url'

import js from '@eslint/js'
import globals from 'globals'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import projectConfig, { reactHooksPlugin } from '../../scripts/lint/eslint.config.mjs'

export default defineConfig([
  // ESLint 10 从被检查文件查找配置；以仓库根目录解析共享规则的 glob。
  {
    basePath: fileURLToPath(new URL('../../', import.meta.url)),
    extends: projectConfig,
  },
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      reactHooksPlugin.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
