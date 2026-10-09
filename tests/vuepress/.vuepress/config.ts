import { defineUserConfig } from 'vuepress';
import { viteBundler } from '@vuepress/bundler-vite';
import { codexClawdPetPlugin } from '../../../dist/node/index.js';
export default defineUserConfig({
  base: '/pet-docs/',
  lang: 'zh-CN',
  title: 'Pet integration test',
  bundler: viteBundler(),
  theme: { name: 'pet-test-theme' },
  plugins: [codexClawdPetPlugin({ size: 140, darkBehavior: 'sleep' })],
});
