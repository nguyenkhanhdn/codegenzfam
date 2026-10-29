import { migrateLegacyUsers } from "./legacy-users.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
function check(r: any) {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
Deno.serve(async (req: Request) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  try {
    const token = req.headers.get("x-migration-token") || "";
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
      ),
    )
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const run = check(
      await db
        .from("codegenz_migration_runs")
        .select("*")
        .eq("token_hash", hash)
        .eq("completed", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle(),
    );
    if (!token || !run)
      return Response.json(
        { error: "Invalid or expired migration grant" },
        { status: 401 },
      );
    const body = await req.json();
    if (run.manifest?.source === "public.users") {
      if (body.action === "legacy-users") {
        const result = await migrateLegacyUsers(db, body);
        if (body.verify) {
          check(await db.from("codegenz_migration_runs").update({completed:true,manifest:{...run.manifest,...result}}).eq("id",run.id));
        }
        return Response.json(result, {headers:{"Cache-Control":"no-store"}});
      }
      return Response.json({error:"This grant only allows the approved users migration"},{status:403});
    }
    if (body.action === "complete") {
      check(
        await db
          .from("codegenz_migration_runs")
          .update({ completed: true, manifest: body.manifest || {} })
          .eq("id", run.id),
      );
      return Response.json({ completed: true });
    }
    if (body.action === "verify") {
      const profiles = [];
      for (let offset = 0; ; offset += 500) {
        const rows = check(
          await db
            .from("codegenz_profiles")
            .select("legacy_id,data")
            .order("legacy_id")
            .range(offset, offset + 499),
        );
        profiles.push(...rows);
        if (rows.length < 500) break;
      }
      const documents = [];
      for (let offset = 0; ; offset += 500) {
        const rows = check(
          await db
            .from("codegenz_documents")
            .select("collection,id,data")
            .order("collection")
            .order("id")
            .range(offset, offset + 499),
        );
        documents.push(...rows);
        if (rows.length < 500) break;
      }
      return Response.json(
        { profiles, documents },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (
      !Array.isArray(body.rows) ||
      body.rows.length > 50 ||
      typeof body.collection !== "string"
    )
      return Response.json({ error: "Invalid batch" }, { status: 400 });
    let imported = 0;
    for (const row of body.rows) {
      const id = String(row.id);
      const data = { ...row.data, id };
      if (body.collection === "users") {
        const exists = check(
          await db
            .from("codegenz_profiles")
            .select("legacy_id")
            .eq("legacy_id", id)
            .maybeSingle(),
        );
        if (exists) {
          imported++;
          continue;
        }
        if (!data.email)
          throw new Error(
            "An account is missing email; source needs manual mapping.",
          );
        const { password, ...profile } = data;
        const result = check(
          await db.auth.admin.createUser({
            email: profile.email,
            password:
              typeof password === "string" && password.length >= 6
                ? password
                : crypto.randomUUID() + crypto.randomUUID(),
            email_confirm: !!profile.verified,
            user_metadata: { name: profile.name, requested_role: profile.role },
            app_metadata: { legacy_id: id },
          }),
        );
        const status = ["active", "locked", "pending"].includes(profile.status)
          ? profile.status
          : "active";
        check(
          await db
            .from("codegenz_profiles")
            .update({
              data: { ...profile, id, status, mustChangePassword: true },
            })
            .eq("auth_user_id", result.user.id),
        );
        if (status === "locked")
          check(
            await db.auth.admin.updateUserById(result.user.id, {
              ban_duration: "876000h",
            }),
          );
      } else {
        if (
          body.collection === "consultations" &&
          data.privateProfessionalNotes
        ) {
          check(
            await db
              .from("codegenz_documents")
              .upsert({
                collection: "professional_notes",
                id,
                data: {
                  id,
                  psychologistId: data.psychologistId,
                  notes: data.privateProfessionalNotes,
                },
              }),
          );
          delete data.privateProfessionalNotes;
        }
        delete data.password;
        check(
          await db
            .from("codegenz_documents")
            .upsert(
              { collection: body.collection, id, data },
              { onConflict: "collection,id", ignoreDuplicates: true },
            ),
        );
      }
      imported++;
    }
    return Response.json({ imported });
  } catch (error) {
    const code = String(error?.migrationCode || "MAPPING_FAILED").replace(/[^a-zA-Z0-9_]/g, "");
    console.error("Migration batch failed; source retained.", { code });
    return Response.json(
      {
        error:
          "Migration batch failed. Inspect source mappings and retry; completed rows are preserved.",
        code,
        stage: String(error?.migrationStage || "unknown").replace(/[^a-zA-Z0-9_-]/g, ""),
      },
      { status: 400 },
    );
  }
});
