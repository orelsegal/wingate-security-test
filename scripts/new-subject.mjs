/**
 * יוצר אפליקציית מקצוע חדשה מהתבנית — בלי להעתיק את הריפו ידנית.
 *
 *   node scripts/new-subject.mjs ../wingate-math --name "מתמטיקה" --accent "#2F5FA6" --badge "35%"
 *
 * מה הסקריפט עושה:
 *   1. מעתיק את התבנית לתיקייה חדשה (בלי node_modules / dist / .git).
 *   2. מעדכן את שם החבילה, ה־manifest וקובץ ה־theme.
 *   3. מחליף את קובץ התוכן בשלד ריק — בלי תוכן הדוגמה.
 */
import { cpSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import process from "node:process";

const [, , targetArg, ...rest] = process.argv;

if (!targetArg) {
  console.error('שימוש: node scripts/new-subject.mjs <תיקיית יעד> --name "שם המקצוע" [--accent #12866B] [--badge 30%]');
  process.exit(1);
}

const flags = {};
for (let i = 0; i < rest.length; i += 2) flags[rest[i].replace(/^--/, "")] = rest[i + 1];

const target = resolve(targetArg);
const slug = basename(target);
const subjectName = flags.name ?? slug;
const accent = flags.accent ?? "#2F5FA6";
const badge = flags.badge ?? "";
const icon = flags.icon ?? "◈";

if (existsSync(target)) {
  console.error(`התיקייה כבר קיימת: ${target}`);
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");
const skip = new Set(["node_modules", "dist", ".git", "docs"]);

mkdirSync(target, { recursive: true });
cpSync(root, target, {
  recursive: true,
  filter: (src) => !skip.has(basename(src)) || src === root,
});

/* package.json */
const pkgPath = `${target}/package.json`;
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.name = slug;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

/* manifest */
const manifestPath = `${target}/public/manifest.webmanifest`;
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.name = subjectName;
manifest.short_name = subjectName.slice(0, 12);
manifest.description = `${subjectName} — מסלול לימוד`;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

/* theme */
const shade = (hex, amount) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(c + (255 - c) * amount))),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

writeFileSync(
  `${target}/src/content/theme.ts`,
  `import type { SubjectTheme } from "../data/types";

export const theme: SubjectTheme = {
  subjectName: ${JSON.stringify(subjectName)},
  percentBadge: ${JSON.stringify(badge)},
  accent: "${accent}",
  accentSoft: "${shade(accent, 0.88)}",
  accentStrong: "${shade(accent, -0.15)}",
  icon: ${JSON.stringify(icon)},
  words: {
    unit: "יחידה",
    units: "יחידות",
    step: "תחנה",
    steps: "תחנות",
    mapTitle: "מפת היחידות",
    mapSubtitle: "כל יחידה נפתחת אחרי אישור הקודמת",
  },
};
`,
);

/* content skeleton */
writeFileSync(
  `${target}/src/content/course.ts`,
  `import type { Course } from "../data/types";

/** כל התוכן של ${subjectName} נמצא כאן: יחידות, תחנות ושדות תשובה. */
export const course: Course = {
  id: ${JSON.stringify(slug)},
  title: ${JSON.stringify(subjectName)},
  intro: "",
  units: [
    {
      id: "u1",
      title: "יחידה 1",
      steps: [
        {
          id: "u1s1",
          title: "תחנה 1",
          prompt: "",
          fields: [{ id: "a1", label: "התשובה שלך", type: "long", required: true }],
        },
      ],
    },
  ],
};
`,
);

console.log(`נוצרה אפליקציה חדשה: ${target}

השלבים הבאים:
  cd ${targetArg}
  npm install
  npm run icons     # אייקונים בצבע החדש (ערכי הצבע בתוך scripts/make-icons.mjs)
  npm run dev

לעריכה: src/content/course.ts (תוכן) ו־src/content/theme.ts (מיתוג).`);
