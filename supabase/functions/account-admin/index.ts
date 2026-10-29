import { createClient } from "npm:@supabase/supabase-js@2.118.0";
const url = Deno.env.get("SUPABASE_URL")!;
const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const roles = ["student", "parent", "psychologist", "admin"];
const allowed = [
  "name",
  "email",
  "role",
  "familyRole",
  "grade",
  "title",
  "bio",
  "phone",
  "avatar",
  "verified",
  "permissions",
];
function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
}
function trusted(origin: string) {
  return (
    origin === "https://codegenzfam.vercel.app" ||
    origin === "https://codegenzfam-khanh-nguyens-projects-903f375b.vercel.app" ||
    /^https:\/\/codegenzfam-[a-z0-9-]+-khanh-nguyens-projects-903f375b\.vercel\.app$/.test(
      origin,
    ) ||
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  );
}
const fail = (message: string, status = 400) =>
  Object.assign(new Error(message), { status });
function check(result: any) {
  if (result.error) throw fail(result.error.message, 400);
  return result.data;
}
function password(p: unknown) {
  if (typeof p !== "string" || p.length < 10 || p.length > 128)
    throw fail("Mật khẩu cần từ 10 đến 128 ký tự.");
  return p;
}
const safe = (row: any) => ({
  ...row.data,
  authUserId: row.auth_user_id,
  version: row.version,
});
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const headers = cors(origin);
  if (origin && !trusted(origin))
    return Response.json({ error: "Origin not allowed" }, { status: 403 });
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST")
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers },
    );
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw fail("Vui lòng đăng nhập.", 401);
    const { data: identity, error } = await service.auth.getUser(token);
    if (error || !identity.user)
      throw fail("Phiên đăng nhập không hợp lệ.", 401);
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const actor = check(await caller.rpc("codegenz_me"));
    if (!actor) throw fail("Phiên đã bị thu hồi. Vui lòng đăng nhập lại.", 401);
    const body = await req.json();
    const action = body.action;
    if (action === "me") return Response.json({ user: actor }, { headers });
    if (actor.status !== "active")
      throw fail("Tài khoản đang bị khóa hoặc chờ duyệt.", 403);
    if (action === "change-password") {
      check(
        await service.auth.admin.updateUserById(identity.user.id, {
          password: password(body.password),
        }),
      );
      check(
        await service
          .from("codegenz_profiles")
          .update({
            data: {
              ...actor,
              authUserId: undefined,
              version: undefined,
              mustChangePassword: false,
              passwordChangeReason: null,
              lastPasswordChangedAt: new Date().toISOString(),
            },
          })
          .eq("auth_user_id", identity.user.id),
      );
      check(
        await service.rpc("codegenz_revoke_sessions", {
          target: identity.user.id,
        }),
      );
      return Response.json(
        { success: true, message: "Đã đổi mật khẩu. Vui lòng đăng nhập lại." },
        { headers },
      );
    }
    if (actor.mustChangePassword)
      throw fail("Bạn cần đổi mật khẩu trước khi tiếp tục.", 403);
    if (action === "update-self") {
      const row = check(
        await service
          .from("codegenz_profiles")
          .select("*")
          .eq("auth_user_id", identity.user.id)
          .single(),
      );
      const updates = Object.fromEntries(
        Object.entries(body.updates || {}).filter(([k]) =>
          ["name", "avatar", "bio", "phone", "grade"].includes(k),
        ),
      );
      const result = check(
        await service
          .from("codegenz_profiles")
          .update({ data: { ...row.data, ...updates } })
          .eq("auth_user_id", identity.user.id)
          .select()
          .single(),
      );
      return Response.json({ success: true, user: safe(result) }, { headers });
    }
    if (action === "audit") {
      const entry = body.entry || {};
      if (actor.role !== "admin" && String(entry.action).startsWith("ADMIN_"))
        throw fail("Thao tác không hợp lệ.", 403);
      await audit(
        actor,
        String(entry.action || "USER_ACTION").slice(0, 80),
        String(entry.resource || "").slice(0, 200),
      );
      return Response.json({ success: true }, { headers });
    }
    if (action === "journal-reaction") {
      const row = check(
        await caller
          .from("codegenz_documents")
          .select("*")
          .eq("collection", "journal_entries")
          .eq("id", body.id)
          .single(),
      );
      if (actor.role !== "parent")
        throw fail("Chỉ phụ huynh được gửi phản hồi.", 403);
      const reaction = {
        ...(body.reaction?.reaction || body.reaction),
        parentId: actor.id,
        parentName: actor.name,
        createdAt: new Date().toISOString(),
      };
      check(
        await service
          .from("codegenz_documents")
          .update({
            data: {
              ...row.data,
              parentReactions: [...(row.data.parentReactions || []), reaction],
            },
          })
          .eq("collection", "journal_entries")
          .eq("id", body.id)
          .eq("version", row.version),
      );
      return Response.json({ success: true }, { headers });
    }
    if (action === "family") {
      const result = await familyAction(actor, body);
      return Response.json({ success: true, ...result }, { headers });
    }
    if (actor.role !== "admin" || actor.permissions?.canManageUsers === false)
      throw fail("Chỉ quản trị viên có quyền quản lý tài khoản.", 403);
    if (action === "list") {
      const offset = Math.max(0, Number(body.offset) || 0);
      const rows = check(
        await service
          .from("codegenz_profiles")
          .select("*")
          .neq("data->>status", "deleted")
          .order("legacy_id")
          .range(offset, offset + 199),
      );
      return Response.json({ users: rows.map(safe) }, { headers });
    }
    if (action === "create") {
      const input = body.user || {};
      if (
        !input.name?.trim() ||
        !/^\S+@\S+\.\S+$/.test(input.email || "") ||
        !roles.includes(input.role)
      )
        throw fail("Tên, email hoặc vai trò không hợp lệ.");
      const created = check(
        await service.auth.admin.createUser({
          email: input.email.trim().toLowerCase(),
          password: password(input.password),
          email_confirm: true,
          user_metadata: {
            name: input.name.trim(),
            requested_role: input.role,
          },
        }),
      );
      let saved: any;
      let createdLegacyId: string;
      try {
      const row = check(
        await service
          .from("codegenz_profiles")
          .select("*")
          .eq("auth_user_id", created.user.id)
          .single(),
      );
      const fields = Object.fromEntries(
        Object.entries(input).filter(([k]) => allowed.includes(k)),
      );
      saved = check(
        await service
          .from("codegenz_profiles")
          .update({
            data: {
              ...row.data,
              ...fields,
              id: row.legacy_id,
              email: created.user.email,
              status: "active",
              mustChangePassword: false,
              passwordChangeReason: null,
            },
          })
          .eq("auth_user_id", created.user.id)
          .select()
          .single(),
      );
        createdLegacyId = row.legacy_id;
      } catch (error) {
        await service.auth.admin.deleteUser(created.user.id);
        throw error;
      }
      await audit(actor, "ADMIN_CREATE_USER", createdLegacyId);
      return Response.json({ success: true, user: safe(saved) }, { headers });
    }
    const target = check(
      await service
        .from("codegenz_profiles")
        .select("*")
        .eq("legacy_id", String(body.id))
        .single(),
    );
    if (body.version !== undefined && Number(body.version) !== target.version)
      throw fail(
        "Tài khoản đã được cập nhật ở nơi khác. Vui lòng tải lại.",
        409,
      );
    let updated = { ...target.data };
    if (action === "update") {
      const patch = Object.fromEntries(
        Object.entries(body.updates || {}).filter(([k]) => allowed.includes(k)),
      );
      if (patch.role && !roles.includes(String(patch.role)))
        throw fail("Vai trò không hợp lệ.");
      if (
        target.auth_user_id === identity.user.id &&
        ((patch.role && patch.role !== "admin") ||
          (patch.permissions as any)?.canManageUsers === false)
      )
        throw fail("Không thể tự thu hồi quyền quản trị của phiên hiện tại.");
      if (patch.email && patch.email !== target.data.email) {
        if (!/^\S+@\S+\.\S+$/.test(String(patch.email)))
          throw fail("Email không hợp lệ.");
        check(
          await service.auth.admin.updateUserById(target.auth_user_id, {
            email: String(patch.email).trim().toLowerCase(),
            email_confirm: true,
          }),
        );
        patch.email = String(patch.email).trim().toLowerCase();
      }
      updated = { ...updated, ...patch };
    } else if (action === "status") {
      if (!["active", "locked"].includes(body.status))
        throw fail("Trạng thái không hợp lệ.");
      if (target.auth_user_id === identity.user.id && body.status === "locked")
        throw fail("Không thể tự khóa tài khoản đang đăng nhập.");
      updated.status = body.status;
      if (body.status === "active") {
        updated.approvedAt = new Date().toISOString();
        updated.approvedBy = actor.id;
      }
    } else if (action === "reset-password") {
      password(body.password);
      updated.mustChangePassword = true;
      updated.passwordChangeReason = "admin-reset";
      updated.lastPasswordChangedAt = new Date().toISOString();
    } else if (action === "delete") {
      if (target.auth_user_id === identity.user.id)
        throw fail("Không thể xóa tài khoản đang đăng nhập.");
      updated.status = "deleted";
      updated.deletedAt = new Date().toISOString();
    } else throw fail("Thao tác không được hỗ trợ.");
    // Confirm through Auth only after an authorized admin approval/promotion.
    // Keep the profile pending until this succeeds so a partial failure cannot grant access.
    if ((action === "status" && body.status === "active") ||
        (action === "update" && updated.role === "admin" && target.data.role !== "admin")) {
      check(await service.auth.admin.updateUserById(target.auth_user_id, {
        email_confirm: true,
        ...(action === "status" ? {ban_duration: "none"} : {}),
      }));
    }
    // The DB guard serializes updates and protects the last active administrator.
    const saved = check(
      await service
        .from("codegenz_profiles")
        .update({ data: updated })
        .eq("auth_user_id", target.auth_user_id)
        .eq("version", target.version)
        .select()
        .single(),
    );
    if (action === "status")
      check(
        await service.auth.admin.updateUserById(target.auth_user_id, {
          ban_duration: body.status === "locked" ? "876000h" : "none",
        }),
      );
    if (action === "reset-password")
      check(
        await service.auth.admin.updateUserById(target.auth_user_id, {
          password: body.password,
        }),
      );
    if (action === "delete")
      check(
        await service.auth.admin.updateUserById(target.auth_user_id, {
          ban_duration: "876000h",
        }),
      );
    if (
      ["status", "reset-password", "delete"].includes(action) ||
      updated.role !== target.data.role ||
      JSON.stringify(updated.permissions) !==
        JSON.stringify(target.data.permissions)
    )
      check(
        await service.rpc("codegenz_revoke_sessions", {
          target: target.auth_user_id,
        }),
      );
    if (action === "delete")
      check(await service.auth.admin.deleteUser(target.auth_user_id, true));
    await audit(
      actor,
      `ADMIN_${action.toUpperCase().replaceAll("-", "_")}`,
      target.legacy_id,
    );
    return Response.json(
      {
        success: true,
        user: safe(saved),
        message:
          action === "reset-password"
            ? "Đã reset mật khẩu và thu hồi các phiên đăng nhập."
            : undefined,
      },
      { headers },
    );
  } catch (error) {
    const e = error as any;
    console.error("Account action failed", { status: e.status || 500 });
    return Response.json(
      {
        success: false,
        error: e.status
          ? e.message
          : "Không thể hoàn tất thao tác tài khoản. Vui lòng thử lại.",
      },
      { status: e.status || 500, headers },
    );
  }
});
async function audit(actor: any, action: string, target: string) {
  const id = crypto.randomUUID();
  check(
    await service
      .from("codegenz_documents")
      .insert({
        collection: "audit_logs",
        id,
        data: {
          id,
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action,
          resource: `user:${target}`,
          details: "Quản trị tài khoản qua Supabase Auth",
          timestamp: new Date().toISOString(),
          status: "SUCCESS",
        },
      }),
  );
}

async function familyAction(actor: any, body: any) {
  const p = body.payload || {};
  const id = body.id;
  const op = body.operation;
  const resource = body.resource;
  const find = async (id: string) =>
    check(
      await service
        .from("codegenz_documents")
        .select("*")
        .eq("collection", "families")
        .eq("id", id)
        .single(),
    );
  const profile = async (id: string) =>
    check(
      await service
        .from("codegenz_profiles")
        .select("*")
        .eq("legacy_id", id)
        .single(),
    );
  const member = (f: any) =>
    (f.studentIds || []).includes(actor.id) ||
    (f.parentIds || []).includes(actor.id);
  const save = async (f: any) =>
    check(
      await service
        .from("codegenz_documents")
        .upsert({ collection: "families", id: f.id, data: f }),
    );
  const link = async (f: any, target: any, familyRole: string) => {
    const oldFamily = target.data.familyId;
    if (oldFamily && oldFamily !== f.id) {
      const old = await find(oldFamily);
      await save({
        ...old.data,
        studentIds: (old.data.studentIds || []).filter(
          (x: string) => x !== target.legacy_id,
        ),
        parentIds: (old.data.parentIds || []).filter(
          (x: string) => x !== target.legacy_id,
        ),
      });
    }
    check(
      await service
        .from("codegenz_profiles")
        .update({ data: { ...target.data, familyId: f.id, familyRole } })
        .eq("auth_user_id", target.auth_user_id),
    );
    const key = target.data.role === "student" ? "studentIds" : "parentIds";
    await save({
      ...f,
      [key]: [...new Set([...(f[key] || []), target.legacy_id])],
    });
  };
  if (resource === "family" && op === "join") {
    const code = String(p.familyCode || "")
      .trim()
      .toUpperCase();
    if (!code) throw fail("Vui lòng nhập mã gia đình.");
    const f = check(
      await service
        .from("codegenz_documents")
        .select("*")
        .eq("collection", "families")
        .eq("data->>familyCode", code)
        .single(),
    );
    await link(f.data, await profile(actor.id), actor.familyRole);
    return { family: f.data, message: "Đã tham gia gia đình." };
  }
  if (resource === "families" && (id === "create" || op === "create")) {
    if (!["student", "parent", "admin"].includes(actor.role))
      throw fail("Không thể tạo gia đình.", 403);
    const fid = crypto.randomUUID();
    const f = {
      id: fid,
      name: String(p.name || "Gia đình mới"),
      familyCode: "CODE-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      studentIds: actor.role === "student" ? [actor.id] : [],
      parentIds: actor.role === "parent" ? [actor.id] : [],
      happinessPoints: 0,
      streakDays: 0,
      createdAt: new Date().toISOString(),
    };
    await save(f);
    if (actor.role !== "admin")
      await link(f, await profile(actor.id), actor.familyRole);
    return { data: f, family: f };
  }
  if (resource === "family-invitations") {
    if (op === "respond") {
      const inv = check(
        await service
          .from("codegenz_documents")
          .select("*")
          .eq("collection", "family_invitations")
          .eq("id", id)
          .single(),
      );
      if (
        inv.data.status !== "pending" ||
        String(inv.data.recipientEmailOrPhone).toLowerCase() !==
          actor.email.toLowerCase()
      )
        throw fail("Lời mời không hợp lệ.", 403);
      if (p.status === "accepted") {
        const f = await find(inv.data.familyId);
        await link(f.data, await profile(actor.id), inv.data.targetFamilyRole);
      }
      check(
        await service
          .from("codegenz_documents")
          .update({
            data: {
              ...inv.data,
              status: p.status === "accepted" ? "accepted" : "declined",
            },
          })
          .eq("collection", "family_invitations")
          .eq("id", id),
      );
      return { message: "Đã xử lý lời mời." };
    }
    const f = await find(p.familyId);
    if (!member(f.data) && actor.role !== "admin")
      throw fail("Không có quyền mời vào gia đình này.", 403);
    const inv = {
      ...p,
      id: p.id || crypto.randomUUID(),
      senderId: actor.id,
      senderName: actor.name,
      status: "pending",
    };
    check(
      await service
        .from("codegenz_documents")
        .insert({ collection: "family_invitations", id: inv.id, data: inv }),
    );
    return {};
  }
  const row = await find(id);
  const f = row.data;
  if (!member(f) && actor.role !== "admin")
    throw fail("Không có quyền quản lý gia đình.", 403);
  if (op === "add-member") {
    if (actor.role !== "admin")
      throw fail(
        "Thành viên cần chấp nhận lời mời hoặc nhập mã gia đình.",
        403,
      );
    await link(f, await profile(p.userId), p.familyRole);
    return {};
  }
  if (op === "remove-member") {
    if (actor.role !== "admin" && p.userId !== actor.id)
      throw fail(
        "Chỉ quản trị viên hoặc chính thành viên có thể rời nhóm.",
        403,
      );
    const target = await profile(p.userId);
    check(
      await service
        .from("codegenz_profiles")
        .update({ data: { ...target.data, familyId: null } })
        .eq("auth_user_id", target.auth_user_id),
    );
    await save({
      ...f,
      studentIds: (f.studentIds || []).filter((x: string) => x !== p.userId),
      parentIds: (f.parentIds || []).filter((x: string) => x !== p.userId),
    });
    return {};
  }
  if (body.method === "DELETE") {
    if (actor.role !== "admin")
      throw fail("Chỉ quản trị viên được xóa gia đình.", 403);
    if ((f.studentIds || []).length + (f.parentIds || []).length)
      throw fail("Hãy chuyển các thành viên ra khỏi gia đình trước khi xóa.");
    check(
      await service
        .from("codegenz_documents")
        .delete()
        .eq("collection", "families")
        .eq("id", id),
    );
    return {};
  }
  const fields = Object.fromEntries(
    Object.entries(p).filter(([k]) =>
      ["name", "description", "avatarIcon"].includes(k),
    ),
  );
  await save({ ...f, ...fields });
  return { data: { ...f, ...fields } };
}
