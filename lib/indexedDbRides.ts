"use client";

const DB_NAME = "sps_db";
const DB_VERSION = 1;
const STORE_NAME = "registered_rides";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "rideId" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Enregistre une sortie dans IndexedDB pour que le Service Worker puisse vérifier
 * si cet appareil est inscrit lors de la réception d'un push à 19h.
 */
export async function saveRegisteredRide(rideId: string): Promise<void> {
  if (!rideId) return;
  const db = await openDb();
  if (!db) return;

  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ rideId, registeredAt: new Date().toISOString() });
  } catch {
    // Silencieux
  }
}

/**
 * Supprime une sortie d'IndexedDB lors du retrait d'une participation.
 */
export async function removeRegisteredRide(rideId: string): Promise<void> {
  if (!rideId) return;
  const db = await openDb();
  if (!db) return;

  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(rideId);
  } catch {
    // Silencieux
  }
}

/**
 * Synchronise l'ensemble des sorties actives de ce navigateur vers IndexedDB.
 */
export async function syncAllRegisteredRides(rideIds: Iterable<string>): Promise<void> {
  const db = await openDb();
  if (!db) return;

  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const rideId of rideIds) {
      if (rideId) {
        store.put({ rideId, registeredAt: new Date().toISOString() });
      }
    }
  } catch {
    // Silencieux
  }
}
