// Builds api/src/db/seed/exercises.json from free-exercise-db + translations.json
// and downloads exercise images into api/static/exercises/ (existing files are skipped).
// Usage: node scripts/exercises/build.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5'; // yuhonas/free-exercise-db, pinned
const RAW = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}`;
const root = join(import.meta.dirname, '../..');
const staticDir = join(root, 'api/static/exercises');
const outFile = join(root, 'api/src/db/seed/exercises.json');

const fetchOk = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
};

// Enum values straight from the shared dictionaries, so the lists can't drift.
const dictSrc = readFileSync(join(root, 'shared/src/dictionaries.ts'), 'utf8');
const enumOf = (name) => {
  const body = dictSrc.match(new RegExp(`export const ${name}_LABELS = \\{([\\s\\S]*?)\\} as const`))[1];
  return new Set([...body.matchAll(/^\s*'?([^':\n]+?)'?:/gm)].map((m) => m[1]));
};
const enums = Object.fromEntries(
  ['CATEGORY', 'EQUIPMENT', 'MUSCLE', 'LEVEL', 'FORCE', 'MECHANIC'].map((n) => [n, enumOf(n)]),
);

const source = await (await fetchOk(`${RAW}/dist/exercises.json`)).json();
const translations = JSON.parse(readFileSync(join(import.meta.dirname, 'translations.json'), 'utf8'));
const nullable = (v) => (v == null || v === 'None' ? null : v);

const errors = [];
const check = (ok, id, msg) => ok || errors.push(`${id}: ${msg}`);

const records = source.map((e) => {
  const t = translations[e.id] ?? {};
  const r = {
    externalId: e.id,
    name: e.name,
    nameUk: t.nameUk,
    popularity: t.popularity,
    category: e.category,
    equipment: nullable(e.equipment),
    primaryMuscles: e.primaryMuscles,
    secondaryMuscles: e.secondaryMuscles,
    level: nullable(e.level),
    force: nullable(e.force),
    mechanic: nullable(e.mechanic),
    instructions: e.instructions,
    images: e.images.map((p) => `/static/exercises/${p}`),
  };
  check(/^[\w-]+$/.test(e.id), e.id, 'unsafe id');
  check(typeof r.nameUk === 'string' && r.nameUk.trim() !== '', e.id, 'missing nameUk');
  check(Number.isInteger(r.popularity) && r.popularity >= 1 && r.popularity <= 10, e.id, 'bad popularity');
  check(enums.CATEGORY.has(r.category), e.id, `category ${r.category}`);
  check(r.equipment === null || enums.EQUIPMENT.has(r.equipment), e.id, `equipment ${r.equipment}`);
  check(r.level === null || enums.LEVEL.has(r.level), e.id, `level ${r.level}`);
  check(r.force === null || enums.FORCE.has(r.force), e.id, `force ${r.force}`);
  check(r.mechanic === null || enums.MECHANIC.has(r.mechanic), e.id, `mechanic ${r.mechanic}`);
  for (const m of [...r.primaryMuscles, ...r.secondaryMuscles]) check(enums.MUSCLE.has(m), e.id, `muscle ${m}`);
  for (const p of e.images) check(p.startsWith(`${e.id}/`) && /^[\w-]+\/\d+\.jpg$/.test(p), e.id, `unsafe image ${p}`);
  return r;
});
for (const id of Object.keys(translations)) check(source.some((e) => e.id === id), id, 'translation for unknown id');
if (errors.length) throw new Error(`Validation failed:\n${errors.join('\n')}`);

// Download missing images, 20 at a time.
const images = source.flatMap((e) => e.images);
const missing = images.filter((p) => !existsSync(join(staticDir, p)));
for (let i = 0; i < missing.length; i += 20) {
  await Promise.all(
    missing.slice(i, i + 20).map(async (p) => {
      const buf = Buffer.from(await (await fetchOk(`${RAW}/exercises/${p}`)).arrayBuffer());
      mkdirSync(dirname(join(staticDir, p)), { recursive: true });
      writeFileSync(join(staticDir, p), buf);
    }),
  );
  console.log(`images: ${Math.min(i + 20, missing.length)}/${missing.length}`);
}
const absent = images.filter((p) => !existsSync(join(staticDir, p)));
if (absent.length) throw new Error(`Missing images:\n${absent.join('\n')}`);

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(records, null, 2) + '\n');

// Proofreading table for the 100 most popular exercises.
const top = [...records].sort((a, b) => a.popularity - b.popularity || a.name.localeCompare(b.name)).slice(0, 100);
writeFileSync(
  join(import.meta.dirname, 'review-top100.md'),
  `# Топ-100 вправ за популярністю (для вичитки)\n\n| Популярність | EN | UK |\n|---|---|---|\n` +
    top.map((r) => `| ${r.popularity} | ${r.name} | ${r.nameUk} |`).join('\n') +
    '\n',
);
console.log(`OK: ${records.length} exercises, ${images.length} images`);
