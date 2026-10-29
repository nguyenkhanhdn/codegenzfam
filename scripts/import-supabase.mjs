import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const input = process.env.MIGRATION_EXPORT;
if (!input) throw new Error("Set MIGRATION_EXPORT to the source JSON file.");
const snapshot = JSON.parse(await readFile(input, "utf8"));
const mapping = {
  users: "users",
  families: "families",
  familyInvitations: "family_invitations",
  journalEntries: "journal_entries",
  consultations: "consultations",
  deepTalkTopics: "deep_talk_topics",
  deepTalkSessions: "deep_talk_sessions",
  challengeTasks: "challenge_tasks",
  challengeProgress: "challenge_progress",
  happinessHistory: "happiness_history",
  notifications: "notifications",
  auditLogs: "audit_logs",
};
const collections =
  snapshot.collections ||
  Object.fromEntries(
    Object.entries(mapping)
      .filter(([k]) => Array.isArray(snapshot[k]))
      .map(([k, c]) => [
        c,
        snapshot[k].map((data, i) => ({
          id: String(data.id ?? data.day ?? i),
          data,
        })),
      ]),
  );
if (!collections.users?.length)
  throw new Error(
    "No source accounts found. Refusing to treat an empty or demo database as a completed migration.",
  );
const emails = new Set();
for (const { data } of collections.users) {
  const email = String(data.email || "")
    .trim()
    .toLowerCase();
  if (!email || emails.has(email))
    throw new Error(
      "Missing or duplicate source email; resolve mapping before importing.",
    );
  emails.add(email);
}
for (const [collection, rows] of Object.entries(collections)) {
  if (new Set(rows.map((r) => r.id)).size !== rows.length)
    throw new Error(`Duplicate source document in ${collection}`);
  console.log(collection, rows.length);
}
const manifest = {
  sourceHash: createHash("sha256")
    .update(JSON.stringify(collections))
    .digest("hex"),
  counts: Object.fromEntries(
    Object.entries(collections).map(([c, rows]) => [c, rows.length]),
  ),
  exportedAt: snapshot.exportedAt || null,
};
if (process.argv.includes("--dry-run")) {
  console.log("Dry run passed; no writes performed.");
  process.exit(0);
}
const token = process.env.MIGRATION_TOKEN;
if (!token)
  throw new Error(
    "Set a short-lived MIGRATION_TOKEN. Never put it in source or chat.",
  );
const url =
  process.env.SUPABASE_URL || "https://tqnzlwkakeocxufznjfi.supabase.co";
async function call(body) {
  const r = await fetch(url + "/functions/v1/migrate-codegenz", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-migration-token": token },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `Migration HTTP ${r.status}`);
  return data;
}
// Accounts first so legacy references continue to identify the same people.
for (const [collection, rows] of Object.entries(collections).sort(([a], [b]) =>
  a === "users" ? -1 : b === "users" ? 1 : a.localeCompare(b),
)) {
  for (let offset = 0; offset < rows.length; offset += 20) {
    const result = await call({
      collection,
      rows: rows.slice(offset, offset + 20),
    });
    if (result.imported !== rows.slice(offset, offset + 20).length)
      throw new Error("Batch count mismatch");
  }
  console.log("Imported", collection, rows.length);
}
const target = await call({ action: "verify" });
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
const equal = (a, b) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
for (const [collection, rows] of Object.entries(collections))
  for (const row of rows) {
    const expected = { ...row.data, id: row.id };
    delete expected.password;
    if (collection === "users") {
      const actual = target.profiles.find((p) => p.legacy_id === row.id);
      if (!actual) throw new Error("Missing migrated profile");
      for (const [k, v] of Object.entries(expected))
        if (!equal(actual.data[k], v))
          throw new Error(`Profile verification mismatch: field ${k}`);
    } else {
      const actual = target.documents.find(
        (d) => d.collection === collection && d.id === row.id,
      );
      if (!actual)
        throw new Error(`Missing migrated document in ${collection}`);
      if (
        collection === "consultations" &&
        expected.privateProfessionalNotes !== undefined
      ) {
        const note = target.documents.find(
          (d) => d.collection === "professional_notes" && d.id === row.id,
        );
        if (!note || note.data.notes !== expected.privateProfessionalNotes)
          throw new Error("Private professional notes mismatch");
        delete expected.privateProfessionalNotes;
      }
      if (!equal(actual.data, expected))
        throw new Error(`Content verification mismatch in ${collection}`);
    }
  }
await call({ action: "complete", manifest });
if (process.env.MIGRATION_REPORT)
  await writeFile(
    process.env.MIGRATION_REPORT,
    JSON.stringify({ ...manifest, verified: true }, null, 2),
    { mode: 0o600 },
  );
console.log(
  "Every source record verified. Migration grant is now closed. Source data was not deleted.",
);
