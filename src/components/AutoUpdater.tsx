"use client";

import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Dialog } from "@capacitor/dialog";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

export function AutoUpdater() {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkForUpdates = async () => {
      // 1. Validar que estamos en Android
      if (!Capacitor.isNativePlatform()) return;

      const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
      if (!repo) {
        console.warn("AutoUpdater: NEXT_PUBLIC_GITHUB_REPO no está definido en las variables de entorno.");
        return;
      }

      try {
        // 2. Obtener la versión local instalada
        const info = await App.getInfo();
        const localBuild = parseInt(info.build, 10);
        if (isNaN(localBuild)) return;

        // 3. Consultar GitHub Releases
        const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
        if (!res.ok) return;
        const release = await res.json();

        // El tag tiene formato v0.1.0-45 (donde 45 es el build / run_number)
        const parts = release.tag_name.split("-");
        if (parts.length < 2) return;
        
        const cloudBuild = parseInt(parts[parts.length - 1], 10);
        if (isNaN(cloudBuild)) return;

        // 4. Comparar versiones
        if (cloudBuild > localBuild) {
          // Buscar el archivo APK en los assets del release
          const apkAsset = release.assets?.find((asset: any) => asset.name.endsWith(".apk"));
          if (!apkAsset) return;

          // 5. Preguntar al usuario si desea actualizar
          const { value } = await Dialog.confirm({
            title: "Actualización Disponible",
            message: `Hay una nueva versión de PrestaFácil (${release.name}). ¿Deseas descargarla e instalarla ahora?`,
            okButtonTitle: "Actualizar",
            cancelButtonTitle: "Más tarde"
          });

          if (value) {
            // Abrir el navegador nativo para descargar el APK
            await Browser.open({ url: apkAsset.browser_download_url });
          }
        }
      } catch (error) {
        console.error("AutoUpdater Error:", error);
      }
    };

    checkForUpdates();
  }, []);

  return null; // Este componente es silencioso, no renderiza nada visible
}
