#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    args[key] = value;
  }
  return args;
}

async function writeJsonAtomic(file, value) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, file);
}

async function writeTextAtomic(file, value) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, value, 'utf8');
  await fs.rename(tmp, file);
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function wordCount(value) {
  return normalize(value).split(/\s+/).filter(Boolean).length;
}

function duplicateKey(content) {
  return normalize(content).slice(0, 240).toLowerCase();
}

function gradeNumber(grade) {
  return String(grade || '').match(/\d+/)?.[0] || String(grade || '').trim();
}

function splitFirstParagraph(content) {
  const parts = String(content || '').trim().split(/\n\s*\n/);
  return { first: parts[0] || '', rest: parts.slice(1).join('\n\n') };
}

function unitFromTitle(title) {
  return normalize(title).split(':')[0] || normalize(title);
}

function englishIntro({ manifest, page, pageNumber, unit, title }) {
  const grade = gradeNumber(manifest.grade);
  const subject = manifest.subject || 'this subject';
  if (/mixed practice set/i.test(title)) {
    return `Practice route ${pageNumber}: Use this ${subject} page to revisit ${unit} from a fresh angle. Start by recalling the lesson, then create your own examples before comparing answers with a partner.`;
  }
  if (/chapter review/i.test(title)) {
    return `Review stop ${pageNumber}: This Grade ${grade} ${subject} review brings together the key ideas from ${unit}. Read your earlier notes first, then answer with examples that show real understanding.`;
  }
  if (/worked example/i.test(title)) {
    return `Worked example ${pageNumber}: Study ${unit} as a careful Grade ${grade} learner. Notice the method, the vocabulary, and the checking step before you try a similar task independently.`;
  }
  if (/activity and practice|activity/i.test(title)) {
    return `Activity route ${pageNumber}: Begin ${unit} by talking, trying, recording, and improving. Use the task below to turn the lesson into something you can explain or demonstrate.`;
  }
  if (/: learn/i.test(title)) {
    return `Lesson focus ${pageNumber}: In ${unit}, connect the new idea to something you can see, use, read, count, make, or observe around you.`;
  }
  return `Study focus ${pageNumber}: Work through ${title} with care. Read the goal, use the examples, then write a clear response that another learner can follow.`;
}

function kiswahiliIntro({ manifest, pageNumber, unit, title }) {
  const grade = gradeNumber(manifest.grade);
  if (/mixed practice set/i.test(title)) {
    return `Zoezi la marudio ${pageNumber}: Rejelea ${unit} kwa makini. Soma maagizo, toa mfano wako, kisha jadiliana na mwenzako ili kuboresha jibu lako.`;
  }
  if (/chapter review/i.test(title)) {
    return `Kituo cha marudio ${pageNumber}: Katika Kiswahili Darasa la ${grade}, tumia ${unit} kukumbuka msamiati, matamshi, kusoma, kuandika, na mawasiliano uliyojifunza.`;
  }
  if (/worked example/i.test(title)) {
    return `Mfano elekezi ${pageNumber}: Chunguza ${unit} hatua kwa hatua. Angalia maneno muhimu, mpangilio wa jibu, na jinsi ya kujisahihisha baada ya kujaribu.`;
  }
  if (/activity and practice|activity/i.test(title)) {
    return `Shughuli ${pageNumber}: Anza ${unit} kwa kusoma au kusikiliza, kisha zungumza, andika, na uboreshe kazi yako kwa kutumia maoni ya mwenzako.`;
  }
  if (/: learn/i.test(title)) {
    return `Lengo la somo ${pageNumber}: Katika ${unit}, unganisha wazo jipya na mifano kutoka nyumbani, shuleni, au katika jamii yako.`;
  }
  return `Kipengele ${pageNumber}: Soma ${title} kwa makini, tumia mifano, kisha andika jibu wazi linaloonyesha uelewa wako.`;
}

function introFor(manifest, page, pageIndex) {
  const title = normalize(page.title || `Page ${pageIndex + 1}`);
  const unit = unitFromTitle(title);
  const payload = { manifest, page, pageNumber: pageIndex + 1, unit, title };
  if (String(manifest.subject || '').toLowerCase() === 'kiswahili') {
    return kiswahiliIntro(payload);
  }
  return englishIntro(payload);
}

function shouldReplaceFirstParagraph(first) {
  return /^(review the chapter carefully|use this page for extra practice|worked example for|activity for|practice for)/i.test(first) ||
    / is the focus of this lesson\./i.test(first);
}

function varyContent(manifest, page, pageIndex) {
  const { first, rest } = splitFirstParagraph(page.content);
  const intro = introFor(manifest, page, pageIndex);
  if (shouldReplaceFirstParagraph(first)) {
    return rest ? `${intro}\n\n${rest}` : intro;
  }
  return `${intro}\n\n${String(page.content || '').trim()}`;
}

function markdownFor(manifest, pages) {
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(manifest.title)}`,
    `book_id: ${JSON.stringify(manifest.bookId)}`,
    `country: ${JSON.stringify(manifest.country)}`,
    `curriculum: ${JSON.stringify(manifest.curriculum)}`,
    `grade: ${JSON.stringify(manifest.grade)}`,
    `subject: ${JSON.stringify(manifest.subject)}`,
    `status: ${JSON.stringify(manifest.status)}`,
    `version: ${JSON.stringify(manifest.version)}`,
    `source_snapshot_hash: ${JSON.stringify(manifest.sourceSnapshotHash)}`,
    '---',
    ''
  ];
  return `${frontmatter.join('\n')}# ${manifest.title}\n\n${pages.map(page => `## ${page.title}\n\n${page.content}`).join('\n\n')}\n`;
}

async function findPackages(root) {
  const found = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    if (entries.some(entry => entry.isFile() && entry.name === 'manifest.json')) {
      found.push(dir);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) await walk(path.join(dir, entry.name));
    }
  }
  await walk(root);
  return found;
}

async function repairPackage(packageDir, dryRun) {
  const manifestPath = path.join(packageDir, 'manifest.json');
  const pagesPath = path.join(packageDir, 'pages.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const pages = JSON.parse(await fs.readFile(pagesPath, 'utf8'));
  if (!Array.isArray(pages)) return { packageDir, changed: 0, duplicateGroups: 0 };

  const groups = new Map();
  pages.forEach((page, index) => {
    const key = duplicateKey(page.content);
    if (key.length <= 80) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });

  const repeated = [...groups.values()].filter(indexes => indexes.length > 2);
  const indexesToRepair = new Set(repeated.flat());
  if (!indexesToRepair.size) {
    return { packageDir, changed: 0, duplicateGroups: 0 };
  }

  const repairedPages = pages.map((page, index) => (
    indexesToRepair.has(index)
      ? { ...page, content: varyContent(manifest, page, index) }
      : page
  ));
  const nextManifest = {
    ...manifest,
    pageCount: repairedPages.length,
    wordCount: repairedPages.reduce((sum, page) => sum + wordCount(page.content), 0),
    contentQuality: {
      ...(manifest.contentQuality || {}),
      repeatedOpeningVariation: {
        appliedAt: new Date().toISOString(),
        duplicateGroups: repeated.length,
        pagesUpdated: indexesToRepair.size,
        method: 'deterministic-title-and-page-type-intro'
      }
    }
  };

  if (!dryRun) {
    await writeJsonAtomic(manifestPath, nextManifest);
    await writeJsonAtomic(pagesPath, repairedPages);
    await writeTextAtomic(path.join(packageDir, `${manifest.bookId}.md`), markdownFor(nextManifest, repairedPages));
    await writeJsonAtomic(path.join(packageDir, `${manifest.bookId}.pages.json`), { ...nextManifest, pages: repairedPages });
  }

  return {
    packageDir,
    bookId: manifest.bookId,
    changed: indexesToRepair.size,
    duplicateGroups: repeated.length,
    wordCount: nextManifest.wordCount
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root || args.dir || process.cwd());
  const dryRun = args.dryRun === 'true';
  const packages = await findPackages(root);
  const reports = [];
  for (const packageDir of packages) {
    reports.push(await repairPackage(packageDir, dryRun));
  }
  const changed = reports.filter(report => report.changed > 0);
  console.log(JSON.stringify({
    root,
    dryRun,
    packages: packages.length,
    changedPackages: changed.length,
    updatedPages: changed.reduce((sum, report) => sum + report.changed, 0),
    duplicateGroups: changed.reduce((sum, report) => sum + report.duplicateGroups, 0),
    changed
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
