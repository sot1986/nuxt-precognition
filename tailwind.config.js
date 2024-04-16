/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './playground/components/**/*.{js,vue,ts}',
    './playground/layouts/**/*.vue',
    './playground/pages/**/*.vue',
    './playground/plugins/**/*.{js,ts}',
    './playground/app.vue',
    './playground/error.vue',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
