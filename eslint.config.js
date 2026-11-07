import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const RENDER_LAYER = ['phaser', 'react', 'react-dom', 'react/jsx-runtime']

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'docs', '.superpowers', 'art-source'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/rules/**/*.ts'],
    rules: {
      // D3：规则层是纯函数，不许碰渲染层
      'no-restricted-imports': ['error', {
        paths: RENDER_LAYER.map((name) => ({ name, message: 'D3：src/rules 必须是纯函数，禁止依赖渲染层' })),
        patterns: [
          { group: ['**/ui/**', '**/game/**', '**/art/**', '**/content/**'], message: 'D3：src/rules 只接收注入的 ctx，不得直接读内容或渲染模块' }
        ]
      }],
      // D10：种子必须可复现，不得使用时间/随机源
      'no-restricted-properties': ['error',
        { object: 'Math', property: 'random', message: 'D10：禁止 Math.random()，用 mulberry32(seedHash(...))' },
        { object: 'Date', property: 'now', message: 'D10：种子不含日期，时间必须由调用方传入' }
      ],
      'no-restricted-globals': ['error',
        { name: 'window', message: 'D3：规则层不得触碰 DOM' },
        { name: 'document', message: 'D3：规则层不得触碰 DOM' },
        { name: 'localStorage', message: 'D3：规则层不得触碰存储' }
      ],
      'no-restricted-syntax': ['error',
        { selector: 'NewExpression[callee.name="Date"]', message: 'D10：规则层禁止读当前时间' }
      ]
    }
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off'
    }
  }
)
