import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createPublicClient } from "./supabase/publicClient";

export interface Suggestion {
  id: string;
  category: string;
  message: string;
  author_name: string;
  is_anonymous: boolean;
  email: string | null;
  status: "new" | "done";
  created_at: string;
}

function getFilePath(): string {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, "suggestions.json");
  } catch {
    return path.join("/tmp", "sps-suggestions.json");
  }
}

function readAllFromFile(): Suggestion[] {
  try {
    const filePath = getFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAllToFile(suggestions: Suggestion[]): void {
  try {
    const filePath = getFilePath();
    fs.writeFileSync(filePath, JSON.stringify(suggestions, null, 2), "utf8");
  } catch (err) {
    console.error("Erreur écriture suggestions fichier :", err);
  }
}

export async function getAllSuggestions(): Promise<Suggestion[]> {
  // 1. Essayer Supabase si la table est créée
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("suggestions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as Suggestion[];
    }
  } catch {
    // Table non existante ou erreur réseau : fallback fichier
  }

  // 2. Fallback fichier local
  const list = readAllFromFile();
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function addSuggestion(params: {
  category: string;
  message: string;
  authorName?: string;
  isAnonymous: boolean;
  email?: string;
}): Promise<Suggestion> {
  const newSuggestion: Suggestion = {
    id: crypto.randomUUID(),
    category: params.category || "💡 Idée / Suggestion",
    message: params.message.trim(),
    author_name: params.isAnonymous ? "Membre anonyme" : params.authorName?.trim() || "Membre SPS",
    is_anonymous: params.isAnonymous,
    email: params.email?.trim() || null,
    status: "new",
    created_at: new Date().toISOString(),
  };

  // 1. Essayer d'insérer dans Supabase
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("suggestions")
      .insert(newSuggestion)
      .select()
      .single();

    if (!error && data) {
      return data as Suggestion;
    }
  } catch {
    // Fallback fichier
  }

  // 2. Fallback fichier local
  const list = readAllFromFile();
  list.unshift(newSuggestion);
  writeAllToFile(list);

  return newSuggestion;
}

export async function toggleSuggestionStatus(id: string): Promise<Suggestion | null> {
  // 1. Essayer Supabase
  try {
    const supabase = createPublicClient();
    const { data: current, error: getErr } = await supabase
      .from("suggestions")
      .select("status")
      .eq("id", id)
      .single();

    if (!getErr && current) {
      const nextStatus = current.status === "done" ? "new" : "done";
      const { data: updated, error: updateErr } = await supabase
        .from("suggestions")
        .update({ status: nextStatus })
        .eq("id", id)
        .select()
        .single();

      if (!updateErr && updated) {
        return updated as Suggestion;
      }
    }
  } catch {
    // Fallback fichier
  }

  // 2. Fallback fichier local
  const list = readAllFromFile();
  const index = list.findIndex((s) => s.id === id);
  if (index === -1) return null;

  list[index].status = list[index].status === "done" ? "new" : "done";
  writeAllToFile(list);

  return list[index];
}

export async function removeSuggestion(id: string): Promise<boolean> {
  // 1. Essayer Supabase
  try {
    const supabase = createPublicClient();
    const { error } = await supabase.from("suggestions").delete().eq("id", id);
    if (!error) return true;
  } catch {
    // Fallback fichier
  }

  // 2. Fallback fichier local
  const list = readAllFromFile();
  const filtered = list.filter((s) => s.id !== id);
  if (filtered.length === list.length) return false;

  writeAllToFile(filtered);
  return true;
}
