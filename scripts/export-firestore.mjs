import { readFile, writeFile, mkdir } from "node:fs/promises";
const config = JSON.parse(
  await readFile(
    new URL("../firebase-applet-config.json", import.meta.url),
    "utf8",
  ),
);
const collections = [
  "users",
  "families",
  "family_invitations",
  "journal_entries",
  "consultations",
  "deep_talk_topics",
  "deep_talk_sessions",
  "challenge_tasks",
  "challenge_progress",
  "happiness_history",
  "notifications",
  "audit_logs",
  "app_settings",
];
function decode(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v)
    return Object.fromEntries(
      Object.entries(v.mapValue.fields || {}).map(([k, v]) => [k, decode(v)]),
    );
  return v;
}
const root = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents`;
const snapshot = {
  exportedAt: new Date().toISOString(),
  source: config.projectId,
  collections: {},
};
for (const collection of collections) {
  let pageToken;
  const rows = [];
  do {
    const url = new URL(`${root}/${collection}`);
    url.searchParams.set("key", config.apiKey);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const r = await fetch(url, {
      signal: AbortSignal.timeout(30000),
      headers: process.env.FIREBASE_ACCESS_TOKEN
        ? { Authorization: `Bearer ${process.env.FIREBASE_ACCESS_TOKEN}` }
        : {},
    });
    if (!r.ok) throw new Error(`Export ${collection}: HTTP ${r.status}`);
    const body = await r.json();
    for (const doc of body.documents || []) {
      const data = Object.fromEntries(
        Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)]),
      );
      rows.push({ id: doc.name.split("/").at(-1), data });
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  snapshot.collections[collection] = rows;
  console.log(collection, rows.length);
}
const destination =
  process.env.MIGRATION_EXPORT ||
  new URL("../../migration-private/firestore.json", import.meta.url);
await mkdir(new URL("../../migration-private/", import.meta.url), {
  recursive: true,
  mode: 0o700,
});
await writeFile(destination, JSON.stringify(snapshot), { mode: 0o600 });
console.log("Source snapshot saved; no records printed.");
