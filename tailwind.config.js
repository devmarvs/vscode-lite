/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          activityBar: '#333333',
          statusBar: '#007acc',
          text: '#cccccc',
          active: '#ffffff',
          hover: '#2a2d2e',
          border: '#454545',
          input: '#3c3c3c',
        }
      }
    },
  },
  plugins: [],
}
