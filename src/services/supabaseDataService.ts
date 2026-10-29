import { supabase, accountAction } from "./supabaseClient";
import { saveCloudDocument, deleteCloudDocument } from "./cloudDatabaseService";
const pending = new Set<Promise<Response>>();
let lastFailure: Error | null = null;
const ok = (data: any = {}) => Response.json({ success: true, ...data });
async function me() {
  const { data, error } = await supabase.rpc("codegenz_me");
  if (error || !data || data.status !== "active" || data.mustChangePassword)
    throw new Error("Phiên đăng nhập không có quyền cập nhật dữ liệu.");
  return data;
}
async function get(collection: string, id: string) {
  const { data, error } = await supabase
    .from("codegenz_documents")
    .select("*")
    .eq("collection", collection)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
async function patch(
  collection: string,
  id: string,
  change: (data: any) => any,
) {
  const row = await get(collection, id);
  const next = change(structuredClone(row.data));
  const { error, data } = await supabase
    .from("codegenz_documents")
    .update({ data: next })
    .eq("collection", collection)
    .eq("id", id)
    .eq("version", row.version)
    .select("id");
  if (error) throw error;
  if (!data.length)
    throw new Error("Dữ liệu đã thay đổi ở thiết bị khác. Vui lòng tải lại.");
  return next;
}
async function dispatch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const actor = await me();
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(String(options.body)) : {};
  const parts = path.split("?")[0].split("/").filter(Boolean).slice(2);
  const [resource, id, action] = parts;
  if (resource === "audit") {
    await accountAction("audit", { entry: body });
    return ok();
  }
  if (resource === "happiness") {
    await saveCloudDocument("happiness_history", body.id, {
      ...body,
      familyId: actor.familyId,
    });
    return ok();
  }
  if (resource === "journals") {
    if (method === "POST" && !id) {
      await saveCloudDocument("journal_entries", body.id, {
        ...body,
        studentId: actor.id,
        familyId: actor.familyId,
      });
      return ok();
    }
    if (method === "DELETE") {
      await deleteCloudDocument("journal_entries", id);
      return ok();
    }
    if (action === "privacy") {
      await patch("journal_entries", id, (d) => ({
        ...d,
        privacy: body.privacy,
      }));
      return ok();
    }
    if (action === "reaction") {
      await accountAction("journal-reaction", { id, reaction: body });
      return ok();
    }
  }
  if (resource === "consultations") {
    if (!id && method === "POST") {
      await saveCloudDocument("consultations", body.id, {
        ...body,
        studentId: actor.id,
      });
      return ok();
    }
    if (action === "messages") {
      const message = body.message || body;
      await patch("consultations", id, (d) => ({
        ...d,
        messages: [
          ...(d.messages || []),
          {
            ...message,
            senderId: actor.id,
            senderName: actor.name,
            senderRole: actor.role,
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
      return ok();
    }
    if (action === "status") {
      const { privateNotes, privateProfessionalNotes, ...fields } = body;
      if (privateNotes !== undefined || privateProfessionalNotes !== undefined)
        await saveCloudDocument("professional_notes", id, {
          id,
          psychologistId: actor.id,
          notes: privateProfessionalNotes ?? privateNotes,
        });
      await patch("consultations", id, (d) => ({
        ...d,
        ...fields,
        updatedAt: new Date().toISOString(),
      }));
      return ok();
    }
  }
  if (resource === "deeptalk") {
    const session = parts[2];
    const op = parts[3];
    if (!session) {
      await saveCloudDocument("deep_talk_sessions", body.id, {
        ...body,
        familyId: actor.familyId,
      });
      return ok();
    }
    if (op === "answer") {
      await patch("deep_talk_sessions", session, (d) => {
        const answers = d.answers || [];
        const field =
          actor.role === "parent" ? "parentAnswer" : "studentAnswer";
        return {
          ...d,
          answers: answers.some((a: any) => a.questionId === body.questionId)
            ? answers.map((a: any) =>
                a.questionId === body.questionId
                  ? { ...a, [field]: body.answer }
                  : a,
              )
            : [
                ...answers,
                { questionId: body.questionId, [field]: body.answer },
              ],
        };
      });
      return ok();
    }
    if (op === "complete") {
      await patch("deep_talk_sessions", session, (d) => ({
        ...d,
        isCompleted: true,
        reflection: body.reflection,
        completedAt: new Date().toISOString(),
      }));
      return ok();
    }
  }
  if (resource === "challenges") {
    const key = `${actor.familyId}:${id}`;
    let row: any;
    try {
      row = (await get("challenge_progress", key)).data;
    } catch (error) {
      if ((error as any)?.code !== "PGRST116") throw error;
      row = {
        day: Number(id),
        familyId: actor.familyId,
        studentConfirmed: false,
        parentConfirmed: false,
      };
    }
    if (!["student", "parent"].includes(actor.role))
      throw new Error("Vai trò không hợp lệ.");
    row[actor.role === "student" ? "studentConfirmed" : "parentConfirmed"] =
      true;
    row.isCompleted = row.studentConfirmed && row.parentConfirmed;
    row.note = body.note || row.note;
    if (row.isCompleted) row.completedAt = new Date().toISOString();
    await saveCloudDocument("challenge_progress", key, row);
    return ok();
  }
  if (resource === "notifications") {
    if (id === "read-all") {
      const { data, error } = await supabase
        .from("codegenz_documents")
        .select("*")
        .eq("collection", "notifications");
      if (error) throw error;
      for (const row of data)
        await patch("notifications", row.id, (d) => ({ ...d, isRead: true }));
      return ok();
    }
    await patch("notifications", id, (d) => ({ ...d, isRead: true }));
    return ok();
  }
  if (
    resource === "families" ||
    resource === "family" ||
    resource === "family-invitations"
  ) {
    const result = await accountAction("family", {
      resource,
      id,
      operation: action || id || method,
      method,
      payload: body,
    });
    return ok(result);
  }
  throw new Error(
    "Chức năng dữ liệu chưa có ánh xạ Supabase. Không có thay đổi nào được ghi.",
  );
}
export function dataRequest(path: string, options: RequestInit = {}) {
  const work = dispatch(path, options).catch((error) => {
    lastFailure =
      error instanceof Error ? error : new Error("Không thể lưu dữ liệu.");
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("codegenz-sync-error", {
          detail: "Chưa lưu được dữ liệu: " + lastFailure.message,
        }),
      );
    throw error;
  });
  pending.add(work);
  void work.then(
    () => pending.delete(work),
    () => pending.delete(work),
  );
  return work;
}
export async function flushDataRequests() {
  await Promise.all([...pending]);
  if (lastFailure) {
    const error = lastFailure;
    lastFailure = null;
    throw error;
  }
}
