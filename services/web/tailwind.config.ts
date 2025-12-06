import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        meshtastic: {
          primary: '#67C186',
          dark: '#1a1a2e',
          light: '#edf2f7',
        },
      },
    },
  },
  plugins: [],
}
export default config
