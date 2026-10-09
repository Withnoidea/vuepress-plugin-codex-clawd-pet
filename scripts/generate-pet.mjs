// Original vector artwork authored for this project; no downloaded character assets.
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const names = ['idle', 'thinking', 'working', 'juggling', 'sleeping', 'drag', 'happy'];
const orange = (x, y, r = 11) =>
  `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#f5a54e"/><path d="M0 ${-r}q9-11 15-5Q9 ${-r + 3} 0 ${-r}" fill="#54886b"/><path d="M-5 -5l-1 3" stroke="#ffd490" stroke-width="3" stroke-linecap="round"/></g>`;
for (const [id, body, light, outline] of [
  ['capybara', '#bb916f', '#d5b593', '#705542'],
  ['moon', '#95afbd', '#c3d3db', '#4b687b'],
]) {
  const directory = new URL(`../src/themes/${id}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const frames = [];
  for (let row = 0; row < 7; row++)
    for (let frame = 0; frame < 6; frame++) {
      const wave = Math.sin((frame / 6) * Math.PI * 2);
      const sleep = row === 4;
      const bounce = row === 6 ? -Math.abs(wave) * 15 : row === 5 ? wave * 5 : wave * 1.8;
      const lean = row === 5 ? wave * 5 : row === 2 ? wave * 1.5 : 0;
      const eyes =
        sleep || (row === 0 && frame === 4)
          ? '<path d="M68 102q5 4 10 0m36 0q5 4 10 0" fill="none" stroke-width="3"/>'
          : '<ellipse cx="73" cy="102" rx="3.2" ry="4"/><ellipse cx="119" cy="102" rx="3.2" ry="4"/>';
      const props =
        row === 1
          ? `<g fill="#70969f"><circle cx="151" cy="66" r="3"/><circle cx="160" cy="53" r="4"/><circle cx="168" cy="35" r="12" fill="#e4f0f0"/><path d="M164 33q0-6 5-5t-2 7v3" fill="none" stroke="#70969f" stroke-width="2"/><circle cx="167" cy="42" r="1"/></g>`
          : row === 2
            ? `<path d="M49 136h94l-8 39H58z" fill="#628593" stroke="#426674" stroke-width="2"/><path d="M54 175h87" stroke="#426674" stroke-width="6" stroke-linecap="round"/><circle cx="96" cy="155" r="5" fill="#e3efec"/>`
            : row === 3
              ? orange(35, 77 + wave * 18, 9) +
                orange(154, 72 - wave * 18, 9) +
                orange(100 + wave * 24, 30, 9)
              : row === 4
                ? `<g fill="none" stroke="#7899a9" stroke-width="3" stroke-linecap="round"><path d="M142 ${65 - wave * 3}h8l-8 9h8M153 ${44 - wave * 4}h12l-12 13h12"/></g>`
                : row === 6
                  ? `<g fill="#e6b45f"><path d="M37 62l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/><path d="M154 ${72 + wave * 8}l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></g>`
                  : '';
      frames.push(
        `<g transform="translate(${frame * 192} ${row * 208})"><ellipse cx="96" cy="183" rx="55" ry="8" fill="#29454f" opacity=".12"/><g transform="translate(0 ${bounce}) rotate(${lean} 96 153)"><use href="#body"/><g fill="${outline}" stroke="${outline}" stroke-linecap="round">${eyes}</g><path d="M90 117q6 6 12 0" stroke="${outline}" fill="none" stroke-width="2.5" stroke-linecap="round"/>${row !== 3 ? orange(93, 52, 12) : ''}${row === 5 ? `<path d="M57 163l${-wave * 7} 12m74-12l${wave * 7} 12" stroke="${outline}" stroke-width="9" stroke-linecap="round"/>` : ''}</g>${props}</g>`,
      );
    }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="1456" viewBox="0 0 1152 1456"><defs><g id="body" stroke="${outline}" stroke-width="2.5" stroke-linejoin="round"><path d="M54 171q-11-27 2-48h79q13 24 2 48z" fill="${body}"/><path d="M70 142q26-12 51 0v29H70z" fill="${light}" stroke="none"/><path d="M54 174q-5-7 3-12h16v13zm65 1v-13h16q8 5 3 12z" fill="${outline}"/><ellipse cx="54" cy="80" rx="13" ry="16" fill="${body}"/><ellipse cx="134" cy="80" rx="13" ry="16" fill="${body}"/><path d="M50 74l7 8m76-8-3 8" stroke="${light}" stroke-width="5" stroke-linecap="round"/><path d="M46 94q0-26 46-27t51 27l3 23q0 22-47 23t-54-20z" fill="${body}"/><path d="M81 103q17-8 39 1l11 16q-25 15-53 2z" fill="${light}" stroke="none"/><ellipse cx="61" cy="114" rx="7" ry="4" fill="#dca68c" stroke="none"/><ellipse cx="131" cy="114" rx="7" ry="4" fill="#dca68c" stroke="none"/><path d="M55 144l9 9m70-9-9 9" stroke-linecap="round" stroke-width="8"/></g></defs>${frames.join('')}</svg>`;
  await writeFile(new URL('spritesheet.svg', directory), svg);
  await sharp(Buffer.from(svg))
    .webp({ lossless: true })
    .toFile(fileURLToPath(new URL('spritesheet.webp', directory)));
  const theme = {
    id,
    name: id === 'moon' ? '月白 · 水豚' : '柚子 · 水豚',
    spritesheet: 'spritesheet.webp',
    frameWidth: 192,
    frameHeight: 208,
    columns: 6,
    rows: 7,
    fps: 6,
    actions: Object.fromEntries(
      names.map((name, row) => [
        name,
        { frames: Array.from({ length: 6 }, (_, i) => row * 6 + i) },
      ]),
    ),
  };
  await writeFile(new URL('theme.json', directory), JSON.stringify(theme, null, 2) + '\n');
}
console.log('Generated 2 original themes × 42 frames (SVG + lossless WebP).');
