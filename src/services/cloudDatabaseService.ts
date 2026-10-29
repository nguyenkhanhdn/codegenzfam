import { supabase } from "./supabaseClient";
import type { User, Family } from "../types";
export const EMPTY_FAMILY: Family = {
  id: "",
  name: "Gia đình",
  familyCode: "",
  studentIds: [],
  parentIds: [],
  happinessPoints: 0,
  streakDays: 0,
  createdAt: "",
};
export interface CloudDbState {
  users: User[];
  families: Family[];
  familyInvitations: any[];
  family: Family;
  journalEntries: any[];
  consultations: any[];
  deepTalkTopics: any[];
  deepTalkSessions: any[];
  challengeTasks: any[];
  challengeProgress: any[];
  happinessHistory: any[];
  notifications: any[];
  auditLogs: any[];
}
const mapping = {
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
export async function fetchFullCloudDatabase(): Promise<CloudDbState> {
  const profiles = [];
  const documents = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("codegenz_profiles")
      .select("*")
      .order("legacy_id")
      .range(offset, offset + 499);
    if (error) throw error;
    profiles.push(...data);
    if (data.length < 500) break;
  }
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("codegenz_documents")
      .select("*")
      .order("collection")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    documents.push(...data);
    if (data.length < 500) break;
  }
  const state: any = {
    users: profiles
      .filter((p) => p.data.status !== "deleted")
      .map((p) => ({
        ...p.data,
        authUserId: p.auth_user_id,
        version: p.version,
      })),
    family: EMPTY_FAMILY,
  };
  for (const [key, collection] of Object.entries(mapping))
    state[key] = documents
      .filter((d) => d.collection === collection)
      .map((d) => d.data);
  state.family = state.families[0] || EMPTY_FAMILY;
  // Professional notes are stored separately under clinician-only RLS.
  for (const note of documents.filter(
    (d) => d.collection === "professional_notes",
  )) {
    const c = state.consultations.find((c: any) => c.id === note.id);
    if (c) c.privateProfessionalNotes = note.data.notes;
  }
  return state;
}
export function subscribeToCloudChanges(callbacks: any) {
  let disposed = false;
  let busy = false;
  const refresh = async () => {
    if (disposed || busy) return;
    busy = true;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const state = await fetchFullCloudDatabase();
      if (disposed) return;
      callbacks.onUsersChange?.(state.users);
      callbacks.onFamiliesChange?.(state.families);
      callbacks.onJournalsChange?.(state.journalEntries);
      callbacks.onConsultationsChange?.(state.consultations);
    } catch (error) {
      console.warn("Supabase refresh failed");
    } finally {
      busy = false;
    }
  };
  const channel = supabase
    .channel("codegenz-data")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "codegenz_documents" },
      refresh,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "codegenz_profiles" },
      refresh,
    )
    .subscribe();
  const timer = setInterval(refresh, 15000); // fallback if Realtime publication is not enabled
  return () => {
    disposed = true;
    clearInterval(timer);
    void supabase.removeChannel(channel);
  };
}
export async function saveCloudDocument(
  collection: string,
  id: string,
  data: any,
) {
  if (collection === "users")
    throw new Error("Tài khoản chỉ được cập nhật qua API quản trị.");
  const cleaned = JSON.parse(JSON.stringify(data));
  delete cleaned.password;
  if (
    collection === "consultations" &&
    cleaned.privateProfessionalNotes !== undefined
  ) {
    const { error } = await supabase
      .from("codegenz_documents")
      .upsert({
        collection: "professional_notes",
        id,
        data: {
          id,
          psychologistId: cleaned.psychologistId,
          notes: cleaned.privateProfessionalNotes,
        },
      });
    if (error) throw error;
    delete cleaned.privateProfessionalNotes;
  }
  const { error } = await supabase
    .from("codegenz_documents")
    .upsert({ collection, id, data: cleaned });
  if (error) throw error;
  return true;
}
export async function deleteCloudDocument(collection: string, id: string) {
  const { error } = await supabase
    .from("codegenz_documents")
    .delete()
    .eq("collection", collection)
    .eq("id", id);
  if (error) throw error;
  return true;
}
