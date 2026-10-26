import fs from "fs";
import path from "path";
import crypto from "crypto";

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

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "suggestions.json");

function ensureFileExists(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
    }
  } catch (err) {
    console.error("Erreur création dossier data/suggestions.json :", err);
  }
}

function readAll(): Suggestion[] {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Erreur lecture suggestions.json :", err);
    return [];
  }
}

function writeAll(suggestions: Suggestion[]): void {
  ensureFileExists();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(suggestions, null, 2), "utf8");
  } catch (err) {
    console.error("Erreur écriture suggestions.json :", err);
  }
}

export async function getAllSuggestions(): Promise<Suggestion[]> {
  const list = readAll();
  // Tri par date décroissante (les plus récentes en premier)
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function addSuggestion(params: {
  category: string;
  message: string;
  authorName?: string;
  isAnonymous: boolean;
  email?: string;
}): Promise<Suggestion> {
  const list = readAll();

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

  list.unshift(newSuggestion);
  writeAll(list);

  return newSuggestion;
}

export async function toggleSuggestionStatus(id: string): Promise<Suggestion | null> {
  const list = readAll();
  const index = list.findIndex((s) => s.id === id);
  if (index === -1) return null;

  list[index].status = list[index].status === "done" ? "new" : "done";
  writeAll(list);

  return list[index];
}

export async function removeSuggestion(id: string): Promise<boolean> {
  const list = readAll();
  const filtered = list.filter((s) => s.id !== id);
  if (filtered.length === list.length) return false;

  writeAll(filtered);
  return true;
}
