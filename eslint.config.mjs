export default [{
  files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
  ignores: ['node_modules/**'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
    globals: Object.fromEntries(['window', 'document', 'localStorage', 'fetch', 'console', 'gsap', 'ScrollToPlugin', 'GradeFlowCore', 'module', 'require', 'URL', 'AbortController', 'AbortSignal', 'setTimeout', 'clearTimeout', 'process', 'Buffer'].map(name => [name, 'readonly']))
  },
  rules: { 'no-unused-vars': 'error', 'no-undef': 'error', 'eqeqeq': 'error', 'no-eval': 'error' }
}, {
  files: ['**/*.mjs'], languageOptions: { sourceType: 'module' }
}];
