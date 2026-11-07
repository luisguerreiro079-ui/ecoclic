"use client";
import { useEffect } from "react";

// Active le service worker (nécessaire pour installer l'appli et, plus tard, recevoir les rappels).
export default function EnregistrerSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
