import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function actor(n, sql, params = []) {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: uid(n), session_id: sid(n) }),
    ]);
    await db.exec("set local role authenticated");
    const r = await db.query(sql, params);
    await db.exec("commit");
    return r.rows;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',created_at timestamptz default now());create table auth.sessions(id uuid primary key,user_id uuid references auth.users);create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;grant usage on schema auth to authenticated;`,
);
await db.exec(
  await readFile(
    new URL("../supabase/schema/accounts.sql", import.meta.url),
    "utf8",
  ),
);
await db.exec(
  await readFile(
    new URL("../supabase/schema/document-guards.sql", import.meta.url),
    "utf8",
  ),
);
for (const [n, role, family] of [
  [1, "admin", ""],
  [2, "student", "fam-a"],
  [3, "parent", "fam-a"],
  [4, "student", "fam-b"],
  [5, "psychologist", ""],
  [6, "admin", ""],
]) {
  await db.query(
    "insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values($1,$2,$3,$4)",
    [
      uid(n),
      `synthetic-${n}@example.invalid`,
      { name: `Synthetic ${n}`, requested_role: role },
      { legacy_id: `test-${n}` },
    ],
  );
  await db.query(
    "update public.codegenz_profiles set data=data||$2::jsonb where auth_user_id=$1",
    [uid(n), { role, status: "active", familyId: family }],
  );
  await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [
    sid(n),
    uid(n),
  ]);
}
for (const [id, privacy] of [
  ["private", "private"],
  ["shared", "share_parent"],
])
  await db.query(
    "insert into codegenz_documents(collection,id,data) values($1,$2,$3)",
    [
      "journal_entries",
      id,
      {
        id,
        studentId: "test-2",
        familyId: "fam-a",
        privacy,
        reason: "Synthetic journal",
      },
    ],
  );
await test("anonymous access cannot read profiles or documents", async () => {
  await db.exec("begin;set local role anon");
  try {
    await assert.rejects(
      () => db.query("select * from codegenz_profiles"),
      /permission denied/,
    );
  } finally {
    await db.exec("rollback");
  }
});
await test("profile never includes a password and is not writable by users", async () => {
  const rows = await actor(2, "select data from codegenz_profiles");
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => !("password" in r.data)));
  await assert.rejects(
    () =>
      actor(2, 'update codegenz_profiles set data=data||\'{"role":"admin"}\''),
    /permission denied/,
  );
});
await test("journal privacy is enforced by the database", async () => {
  assert.equal(
    (
      await actor(
        2,
        "select id from codegenz_documents where collection='journal_entries'",
      )
    ).length,
    2,
  );
  assert.deepEqual(
    await actor(
      3,
      "select id from codegenz_documents where collection='journal_entries'",
    ),
    [{ id: "shared" }],
  );
  assert.equal(
    (
      await actor(
        4,
        "select id from codegenz_documents where collection='journal_entries'",
      )
    ).length,
    0,
  );
  assert.equal(
    (
      await actor(
        1,
        "select id from codegenz_documents where collection='journal_entries'",
      )
    ).length,
    0,
  );
});
await test("student cannot reassign a journal to another account", async () => {
  await assert.rejects(
    () =>
      actor(
        2,
        "update codegenz_documents set data=jsonb_set(data,'{studentId}','\"test-4\"') where id='private'",
      ),
    /Ownership is immutable|row-level security/,
  );
});
await test("members cannot bypass family operations by deleting rows directly", async () => {
  await db.query(
    "insert into codegenz_documents(collection,id,data) values($1,$2,$3)",
    [
      "families",
      "fam-a",
      { id: "fam-a", studentIds: ["test-2"], parentIds: ["test-3"] },
    ],
  );
  await assert.rejects(
    () =>
      actor(
        3,
        "delete from codegenz_documents where collection='families' and id='fam-a'",
      ),
    /authorized account service/,
  );
});
await test("consultation notes cannot leak into the shared record", async () => {
  await assert.rejects(
    () =>
      actor(
        2,
        "insert into codegenz_documents(collection,id,data) values($1,$2,$3)",
        [
          "consultations",
          "c-private",
          {
            id: "c-private",
            studentId: "test-2",
            status: "pending",
            privateProfessionalNotes: "restricted",
          },
        ],
      ),
    /Private notes/,
  );
});
await test("private clinician notes are visible only to the assigned clinician", async () => {
  await db.query(
    "insert into codegenz_documents(collection,id,data) values($1,$2,$3)",
    [
      "professional_notes",
      "notes-a",
      { id: "notes-a", psychologistId: "test-5", notes: "Synthetic" },
    ],
  );
  assert.equal(
    (
      await actor(
        5,
        "select id from codegenz_documents where collection='professional_notes'",
      )
    ).length,
    1,
  );
  assert.equal(
    (
      await actor(
        2,
        "select id from codegenz_documents where collection='professional_notes'",
      )
    ).length,
    0,
  );
});
await test("disabled profiles lose access immediately even with an existing session", async () => {
  await db.query(
    'update codegenz_profiles set data=data||\'{"status":"locked"}\' where auth_user_id=$1',
    [uid(4)],
  );
  assert.equal((await actor(4, "select * from codegenz_documents")).length, 0);
});
await test("revoking sessions invalidates an old JWT at the data boundary", async () => {
  await db.query("delete from auth.sessions where user_id=$1", [uid(2)]);
  assert.equal(
    (await actor(2, "select codegenz_me() as profile"))[0].profile,
    null,
  );
  assert.equal((await actor(2, "select * from codegenz_documents")).length, 0);
});
await test("database protects the final active administrator", async () => {
  await db.query(
    'update codegenz_profiles set data=data||\'{"status":"locked"}\' where auth_user_id=$1',
    [uid(6)],
  );
  await assert.rejects(
    () =>
      db.query(
        'update codegenz_profiles set data=data||\'{"role":"student"}\' where auth_user_id=$1',
        [uid(1)],
      ),
    /quản trị viên/,
  );
});
await test("last administrator cannot lose user-management permission",async()=>{await assert.rejects(()=>db.query("update codegenz_profiles set data=data||'{\"permissions\":{\"canManageUsers\":false}}' where auth_user_id=$1",[uid(1)]),/quản trị viên/);});
await test("self-registered metadata cannot create an administrator", async () => {
  await db.query(
    "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
    [
      uid(7),
      "synthetic-new@example.invalid",
      {
        name: "Untrusted metadata",
        requested_role: "admin",
        role: "admin",
        status: "active",
        permissions: { canManageUsers: true },
      },
    ],
  );
  const r = await db.query(
    "select data from codegenz_profiles where auth_user_id=$1",
    [uid(7)],
  );
  assert.equal(r.rows[0].data.role, "student");
  assert.deepEqual(r.rows[0].data.permissions, {});
});
await db.close();
