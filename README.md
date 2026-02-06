# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Codex (OpenAI) setup

The Codex panel can call the OpenAI API directly from the browser. Add your API key in the Codex UI to enable real responses.

The integration uses the Responses API, so choose a model that supports it (for example, `gpt-5.1-codex`).

Environment variables (optional):

- `VITE_OPENAI_BASE_URL` (default: `https://api.openai.com/v1`)
- `VITE_OPENAI_ORG_ID`
- `VITE_OPENAI_PROJECT_ID`

Security note: avoid shipping API keys in a public frontend. Use a server-side proxy for production deployments.

## Source Control panel

The Source Control view supports two Git backends:

- **Native backend (Capacitor Android)** via the `NativeGit` bridge:
  - reads real repository status from a configured absolute repo path
  - stage/unstage, commit, create branch, switch branch
- **Fallback in-app backend** (browser/local storage model) when native git is unavailable or no repo path is configured.

Notes:
- Native backend requires a device/runtime where `git` is available to the app process.
- Native backend supports trusted repo selection and recent repo quick-pick in the Source Control panel.
- Native status refresh runs automatically on app focus, visibility restore, periodic interval, and debounced editor activity.
- Fallback backend remains persisted in browser storage and does not execute host `git`.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
