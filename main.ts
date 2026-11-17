// Emberfall entry program (Node 22, standard library only).
//
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with the kit's buildDossier
// library. The output directory comes from MAKEFUN_OUTPUT_DIR and defaults
// to /output, the path the grader hands the program.
//
// The program is deterministic: it copies exactly the two directories and
// the dossier the library writes from them, so two runs write the same
// bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(name) {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  if (!existsSync(from)) {
    throw new Error(`missing ${name}/ in the repository`);
  }
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

function main() {
  mkdirSync(outputDir, { recursive: true });
  copyTree('game');
  copyTree('screenshots');

  const dossierPath = join(outputDir, 'dossier.json');
  if (existsSync(dossierPath)) rmSync(dossierPath, { force: true });

  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(dossierPath, dossier);
  console.log(`wrote ${dossierPath} (${dossier.length} bytes)`);
}

main();
