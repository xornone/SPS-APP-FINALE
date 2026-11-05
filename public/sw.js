// Service worker dédié aux notifications push (pas de mise en cache offline
// ici : l'app reste volontairement "force-dynamic" partout, voir les
// commentaires dans app/(shell)/home/page.tsx — ce fichier ne fait que
// recevoir et afficher les notifications push, et ouvrir/focaliser l'app
// au clic dessus).

/**
 * Vérifie dans IndexedDB si cet appareil est inscrit à la sortie indiquée.
 */
function isRegisteredForRide(rideId) {
  return new Promise((resolve) => {
    if (!rideId || !self.indexedDB) return resolve(false);
    try {
      const req = self.indexedDB.open("sps_db", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("registered_rides")) {
          db.createObjectStore("registered_rides", { keyPath: "rideId" });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("registered_rides")) {
          return resolve(false);
        }
        try {
          const tx = db.transaction("registered_rides", "readonly");
          const store = tx.objectStore("registered_rides");
          const getReq = store.get(rideId);
          getReq.onsuccess = () => {
            resolve(Boolean(getReq.result));
          };
          getReq.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      };
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch {
        data = { title: "SPS", body: event.data ? event.data.text() : "" };
      }

      // Si c'est un rappel de veille de sortie, l'afficher UNIQUEMENT aux membres inscrits
      if (data.type === "ride_reminder" && data.rideId) {
        const registered = await isRegisteredForRide(data.rideId);
        if (!registered) {
          // L'appareil n'est pas inscrit à cette sortie : aucune notification
          return;
        }
      }

      const title = data.title || "SPS";
      const options = {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: data.url || "/home" },
      };

      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/home";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
