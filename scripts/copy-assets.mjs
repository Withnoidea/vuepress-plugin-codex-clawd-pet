import { cp } from 'node:fs/promises';
await cp(new URL('../src/themes/', import.meta.url), new URL('../dist/themes/', import.meta.url), {
  recursive: true,
});
console.log('Theme assets copied to dist/themes');
