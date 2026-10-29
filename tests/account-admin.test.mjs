import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const profiles = new Map();
const credentials = new Map();
const sessions = new Set();
let handler;
function add(id, role = "student") {
  profiles.set(id, {
    auth_user_id: id,
    legacy_id: "legacy-" + id,
    version: 1,
    data: {
      id: "legacy-" + id,
      email: id + "@example.invalid",
      name: id,
      role,
      status: "active",
      permissions: {},
    },
  });
  credentials.set(id, { id, email: id + "@example.invalid" });
  sessions.add(id);
}
add("admin", "admin");
add("member");
add("target");
class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.op = "select";
    this.one = false;
  }
  select() {
    return this;
  }
  eq(k, v) {
    this.filters.push([k, v, true]);
    return this;
  }
  neq(k, v) {
    this.filters.push([k, v, false]);
    return this;
  }
  order() {
    return this;
  }
  range() {
    return this;
  }
  update(v) {
    this.op = "update";
    this.values = v;
    return this;
  }
  insert(v) {
    this.op = "insert";
    this.values = v;
    return this;
  }
  upsert(v) {
    return this.insert(v);
  }
  delete() {
    this.op = "delete";
    return this;
  }
  single() {
    this.one = true;
    return this;
  }
  maybeSingle() {
    this.one = true;
    this.optional = true;
    return this;
  }
  then(resolve, reject) {
    return Promise.resolve()
      .then(() => {
        if (this.table === "codegenz_documents")
          return { data: this.values || [], error: null };
        let rows = [...profiles.values()].filter((r) =>
          this.filters.every(([key, v, yes]) => {
            const x = key === "data->>status" ? r.data.status : r[key];
            return yes ? x === v : x !== v;
          }),
        );
        if (this.op === "update")
          rows = rows.map((r) => {
            Object.assign(r, structuredClone(this.values));
            r.version++;
            return r;
          });
        if (this.op === "delete")
          for (const r of rows) profiles.delete(r.auth_user_id);
        if (this.one && !rows.length && !this.optional)
          return {
            data: null,
            error: { message: "Row missing or concurrent update" },
          };
        return {
          data: structuredClone(this.one ? rows[0] || null : rows),
          error: null,
        };
      })
      .then(resolve, reject);
  }
}
function createClient(url, key, options = {}) {
  const caller = options.global?.headers.Authorization?.slice(7);
  return {
    from: (t) => new Query(t),
    rpc: async (name, args) => {
      if (name === "codegenz_me")
        return {
          data: sessions.has(caller)
            ? { ...profiles.get(caller)?.data, authUserId: caller }
            : null,
          error: null,
        };
      if (name === "codegenz_revoke_sessions") {
        sessions.delete(args.target);
        return { data: null, error: null };
      }
      throw Error("Unknown RPC");
    },
    auth: {
      getUser: async (token) => ({
        data: { user: credentials.get(token) || null },
        error: credentials.has(token) ? null : Error("Invalid JWT"),
      }),
      admin: {
        updateUserById: async (id, patch) => {
          Object.assign(credentials.get(id), patch);
          return { data: { user: credentials.get(id) }, error: null };
        },
        createUser: async (input) => {
          const id = "created-" + profiles.size;
          add(id);
          credentials.set(id, { id, ...input });
          profiles.get(id).data.email = input.email;
          return { data: { user: credentials.get(id) }, error: null };
        },
        deleteUser: async (id) => {
          credentials.delete(id);
          return { data: {}, error: null };
        },
      },
    },
  };
}
globalThis.__supabaseTest = { createClient };
globalThis.Deno = {
  env: {
    get: (k) =>
      ({
        SUPABASE_URL: "https://synthetic.invalid",
        SUPABASE_SERVICE_ROLE_KEY: "synthetic-service",
        SUPABASE_ANON_KEY: "synthetic-anon",
      })[k],
  },
  serve: (fn) => {
    handler = fn;
  },
};
let source = await readFile(
  new URL("../supabase/functions/account-admin/index.ts", import.meta.url),
  "utf8",
);
source = source.replace(
  /import\s+\{\s*createClient\s*\}\s+from\s+["'][^"']+["'];?/,
  "const {createClient}=globalThis.__supabaseTest;",
);
const output = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
await import(
  "data:text/javascript;base64," + Buffer.from(output).toString("base64")
);
async function invoke(actor, body) {
  const response = await handler(
    new Request("https://synthetic.invalid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(actor ? { Authorization: "Bearer " + actor } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
}
await test("missing or invalid credentials are rejected", async () => {
  assert.equal((await invoke(null, { action: "list" })).status, 401);
  assert.equal((await invoke("unknown", { action: "list" })).status, 401);
});
await test("non-admin cannot list, create, disable or reset other accounts", async () => {
  for (const action of ["list", "create", "status", "reset-password", "delete"])
    assert.equal(
      (
        await invoke("member", {
          action,
          id: "legacy-target",
          status: "locked",
          password: "Sufficiently-long-123",
        })
      ).status,
      403,
    );
});
await test("self disable, delete and privilege removal are rejected", async () => {
  for (const body of [
    { action: "status", status: "locked" },
    { action: "delete" },
    { action: "update", updates: { role: "student" } },
  ])
    assert.equal(
      (await invoke("admin", { id: "legacy-admin", ...body })).status,
      400,
    );
});
await test("weak reset passwords do not mutate accounts", async () => {
  assert.equal(
    (
      await invoke("admin", {
        action: "reset-password",
        id: "legacy-target",
        password: "short",
      })
    ).status,
    400,
  );
  assert.equal(profiles.get("target").data.mustChangePassword, undefined);
});
await test("reset updates Auth, requires a new password and revokes sessions without returning secrets", async () => {
  const password = "Temporary-Strong-9876";
  const r = await invoke("admin", {
    action: "reset-password",
    id: "legacy-target",
    password,
  });
  assert.equal(r.status, 200);
  assert.equal(credentials.get("target").password, password);
  assert.equal(profiles.get("target").data.mustChangePassword, true);
  assert.equal(profiles.get("target").data.passwordChangeReason, "admin-reset");
  assert.equal(sessions.has("target"), false);
  assert.ok(!JSON.stringify(r.body).includes(password));
});
await test("a revoked session fails even when the JWT still resolves to a user", async () => {
  assert.equal((await invoke("target", { action: "me" })).status, 401);
});
await test("disable bans Auth login and enable removes the ban", async () => {
  let r = await invoke("admin", {
    action: "status",
    id: "legacy-member",
    status: "locked",
  });
  assert.equal(r.status, 200);
  assert.equal(profiles.get("member").data.status, "locked");
  assert.equal(credentials.get("member").ban_duration, "876000h");
  r = await invoke("admin", {
    action: "status",
    id: "legacy-member",
    status: "active",
  });
  assert.equal(r.status, 200);
  assert.equal(credentials.get("member").ban_duration, "none");
});
await test("stale profile version cannot overwrite a newer update", async () => {
  assert.equal(
    (
      await invoke("admin", {
        action: "update",
        id: "legacy-target",
        version: 0,
        updates: { name: "stale" },
      })
    ).status,
    409,
  );
});
await test("profile updates ignore credentials and identity fields", async () => {
  const r = await invoke("admin", {
    action: "update",
    id: "legacy-target",
    updates: {
      password: "not-allowed",
      authUserId: "foreign",
      name: "Updated",
    },
  });
  assert.equal(r.status, 200);
  assert.equal(profiles.get("target").data.name, "Updated");
  assert.equal(profiles.get("target").data.password, undefined);
});

await test("admin approval confirms Auth email, activates the account and records the approver",async()=>{
 profiles.get("member").data.status="pending";
 const result=await invoke("admin",{action:"status",id:"legacy-member",status:"active"});
 assert.equal(result.status,200);
 assert.equal(credentials.get("member").email_confirm,true);
 assert.equal(profiles.get("member").data.status,"active");
 assert.equal(profiles.get("member").data.approvedBy,"legacy-admin");
 assert.ok(profiles.get("member").data.approvedAt);
});

await test("admin-created accounts do not require a first-login password change",async()=>{
 const result=await invoke("admin",{action:"create",user:{name:"Synthetic account",email:"synthetic-created@example.invalid",password:"Synthetic-Strong-1234",role:"student"}});
 assert.equal(result.status,200);assert.equal(result.body.user.mustChangePassword,false);
});
