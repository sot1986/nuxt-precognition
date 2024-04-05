import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['dist', '**/dist/**', 'node_modules', '**/node_modules/**'],
})
