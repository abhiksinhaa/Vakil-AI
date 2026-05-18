import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_MODEL = 'gemini-2.5-flash';

function resolveModel(requested) {
  if (!requested || requested === 'gemini-1.5-flash') {
    return DEFAULT_MODEL;
  }
  return requested;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.VITE_GEMINI_API_KEY || '';
  const model = resolveModel(env.VITE_GEMINI_MODEL);

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          secure: true,
          rewrite: () =>
            `/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        },
      },
    },
  };
});
