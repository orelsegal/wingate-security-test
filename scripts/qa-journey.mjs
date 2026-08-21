/**
 * מסע הדגמה מקצה לקצה + צילומי מסך ב־375 וב־1440.
 * Playwright אינו תלות של התבנית — מריצים אותו לפי הצורך:
 *
 *   npm run build && npm run preview -- --port 4310 &
 *   npx playwright@1 node scripts/qa-journey.mjs      # או: npm i -D playwright
 *
 * משתני סביבה: BASE_URL, SHOTS_DIR, PW_CHROMIUM (נתיב לדפדפן).
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4310";
const SHOTS = process.env.SHOTS_DIR ?? "docs/screenshots";
const EXEC = process.env.PW_CHROMIUM ?? undefined;

const results = [];
function log(name, ok, extra = "") {
  results.push({ name, ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${extra}`);
}

async function noHScroll(page, label) {
  const res = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    dir: document.documentElement.dir,
  }));
  log(`ללא גלילה אופקית — ${label}`, res.scrollW <= res.clientW + 1, `(${res.scrollW}/${res.clientW})`);
  log(`RTL — ${label}`, res.dir === "rtl");
}

async function shot(page, file, label) {
  await page.screenshot({ path: `${SHOTS}/${file}`, fullPage: true });
  await noHScroll(page, label);
}

const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});

/* ---------------- Mobile journey (375px) ---------------- */
const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "he-IL" });
const page = await mobile.newPage();
page.on("pageerror", (e) => log("שגיאת JS בקונסול", false, String(e)));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByRole("tab", { name: "תלמידה" }).waitFor();
await shot(page, "m-01-login.png", "כניסה (375)");

// student sign in
await page.getByRole("button", { name: /נועה דוגמה/ }).click();
await page.getByText("ממשיכים מהמקום שבו עצרת").waitFor();
log("בית תלמידה — כרטיס המשך", true);
await shot(page, "m-02-home.png", "בית תלמידה (375)");

// locked unit really is locked
const lockedDisabled = await page
  .getByRole("button", { name: /יחידת דוגמה 3/ })
  .isDisabled();
log("יחידה נעולה אינה לחיצה", lockedDisabled);

// start unit 1
await page.getByRole("button", { name: "התחילי" }).click();
await page.getByRole("heading", { name: "תחנת פתיחה" }).waitFor();
await shot(page, "m-03-station.png", "תחנה (375)");

// loading state exists on entry (skeleton) — checked via aria-busy on a fresh load
await page.reload({ waitUntil: "commit" });
const sawBusy = await page
  .locator('[aria-busy="true"]')
  .first()
  .waitFor({ timeout: 2000 })
  .then(() => true)
  .catch(() => false);
log("מצב טעינה מוצג", sawBusy);
await page.getByRole("heading", { name: "תחנת פתיחה" }).waitFor();

// answer + save
await page.getByLabel(/מה את מצפה למצוא כאן/).fill("תשובת דוגמה לבדיקת התבנית מקצה לקצה.");
await page.getByRole("button", { name: "שמירה" }).click();
await page.getByText("נשמר").waitFor();
log("שמירת טיוטה", true);

// keyboard: tab reaches the primary action
await page.keyboard.press("Tab");
const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
log("ניווט מקלדת מגיע לכפתור", focused.length > 0, `(${focused})`);

await page.getByRole("button", { name: "לתחנה הבאה" }).click();
await page.getByRole("heading", { name: "תחנת בחירה" }).waitFor();

// submit with a missing required choice -> validation
await page.getByRole("button", { name: "שליחה לבדיקה" }).click();
await page.getByText("חסר משהו").waitFor();
log("חסימת הגשה בלי שדה חובה", true);
await shot(page, "m-04-validation.png", "ולידציה (375)");

await page.getByRole("radio", { name: "אפשרות ב׳" }).check();
await page.getByLabel("למה בחרת בה?").fill("כי זו בדיקה.");
await page.getByRole("button", { name: "שליחה לבדיקה" }).click();

await page.getByText("ההגשה ממתינה לבדיקה").waitFor();
log("הגשה לבדיקה", true);
await shot(page, "m-05-submitted.png", "אחרי הגשה (375)");

// teacher side
await page.getByRole("button", { name: "יציאה" }).click();
await page.getByRole("tab", { name: "מורה" }).click();
await page.getByRole("button", { name: "כניסה כמורה" }).click();
await page.getByRole("heading", { name: "התלמידות שלי" }).waitFor();
await page.locator(".student-list button").first().waitFor();
await shot(page, "m-06-teacher-list.png", "רשימת תלמידות (375)");

const waitingChip = await page.getByRole("button", { name: /ממתינה לבדיקה \(\d+\)/ }).textContent();
log("רמזור: ספירת ממתינות לבדיקה", /[1-9]/.test(waitingChip ?? ""), `(${waitingChip?.trim()})`);

await page.getByRole("button", { name: /נועה דוגמה/ }).click();
await page.getByRole("heading", { name: "נועה דוגמה" }).waitFor();
await page.getByText("הצגת התשובות").first().waitFor();
await page.getByText("הצגת התשובות").first().click();
await page.getByText("תשובת דוגמה לבדיקת התבנית מקצה לקצה.").first().waitFor();
log("המורה רואה את התשובות", true);
await shot(page, "m-07-teacher-student.png", "תלמידה אצל המורה (375)");

// return for fix
await page.getByLabel("משוב לתלמידה").first().fill("משוב בדיקה: נא להרחיב את התשובה הראשונה.");
await page.getByRole("button", { name: "החזרה לתיקון" }).first().click();
await page.getByText("הוחזר לתיקון").first().waitFor();
log("החזרה לתיקון", true);

// student fixes and resubmits
await page.getByRole("button", { name: "יציאה" }).click();
await page.getByRole("button", { name: /נועה דוגמה/ }).click();
await page.getByText("היחידה חזרה לתיקון").waitFor();
log("התלמידה רואה שהיחידה חזרה לתיקון", true);
await shot(page, "m-08-returned.png", "חזרה לתיקון (375)");

await page.getByRole("button", { name: "תיקון והגשה מחדש" }).click();
await page.getByRole("heading", { name: /תחנת/ }).first().waitFor();
const longField = page.getByLabel(/מה את מצפה למצוא כאן/);
if (await longField.count()) {
  await longField.fill("תשובת דוגמה מתוקנת אחרי משוב המורה.");
}
// walk to the last station and resubmit
for (let i = 0; i < 6; i++) {
  const next = page.getByRole("button", { name: "לתחנה הבאה" });
  if (await next.count()) {
    await next.click();
    await page.waitForTimeout(300);
  } else break;
}
await page.getByRole("button", { name: "הגשה מחדש" }).click();
await page.getByText("ההגשה ממתינה לבדיקה").waitFor();
log("הגשה מחדש", true);

// teacher approves
await page.getByRole("button", { name: "יציאה" }).click();
await page.getByRole("tab", { name: "מורה" }).click();
await page.getByRole("button", { name: "כניסה כמורה" }).click();
await page.getByRole("button", { name: /נועה דוגמה/ }).click();
await page.getByLabel("משוב לתלמידה").first().fill("משוב בדיקה: אפשר להמשיך.");
await page.getByRole("button", { name: /אישור ופתיחת ה?יחידה הבאה/ }).first().click();
await page.getByText("משוב שנשלח").first().waitFor();
log("אישור יחידה", true);
await shot(page, "m-09-teacher-approved.png", "אחרי אישור (375)");

// student sees unit 2 open
await page.getByRole("button", { name: "יציאה" }).click();
await page.getByRole("button", { name: /נועה דוגמה/ }).click();
await page.getByText("ממשיכים מהמקום שבו עצרת").waitFor();
const unit2Enabled = await page.getByRole("button", { name: /יחידת דוגמה 2/ }).isEnabled();
log("היחידה הבאה נפתחה לתלמידה", unit2Enabled);
await shot(page, "m-10-home-after-approval.png", "בית אחרי אישור (375)");

await mobile.close();

/* ---------------- Desktop pass (1440px) ---------------- */
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
const d = await desktop.newPage();
await d.goto(BASE, { waitUntil: "networkidle" });
await shot(d, "d-01-login.png", "כניסה (1440)");
await d.getByRole("button", { name: /נועה דוגמה/ }).click();
await d.getByText("ממשיכים מהמקום שבו עצרת").waitFor();
await d.locator(".map .unit-row").first().waitFor();
await shot(d, "d-02-home.png", "בית תלמידה (1440)");
await d.getByRole("button", { name: "התחילי" }).click();
await d.getByRole("heading", { name: /תחנת/ }).first().waitFor();
await shot(d, "d-03-station.png", "תחנה (1440)");
await d.getByRole("button", { name: "יציאה" }).click();
await d.getByRole("tab", { name: "מורה" }).click();
await d.getByRole("button", { name: "כניסה כמורה" }).click();
await d.getByRole("heading", { name: "התלמידות שלי" }).waitFor();
await d.locator(".student-list button").first().waitFor();
await shot(d, "d-04-teacher-list.png", "רשימת תלמידות (1440)");
await d.getByRole("button", { name: /מאיה דוגמה/ }).click();
await d.getByRole("heading", { name: "מאיה דוגמה" }).waitFor();
await d.getByText(/מולאו/).first().waitFor();
await shot(d, "d-05-teacher-student.png", "תלמידה אצל המורה (1440)");

// empty state
await d.getByRole("button", { name: "התלמידות שלי" }).click();
await d.getByRole("heading", { name: "התלמידות שלי" }).waitFor();
await desktop.close();
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} בדיקות עברו`);
if (failed.length) {
  console.log("נכשלו:", failed.map((f) => f.name + " " + f.extra).join(" | "));
  process.exit(1);
}
