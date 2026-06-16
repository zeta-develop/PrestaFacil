"use client";

import { useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Dialog } from "@capacitor/dialog";
import { Capacitor } from "@capacitor/core";
import { UpdateInstaller, type DownloadProgressEvent } from "@/plugins/updateInstaller";

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  name: string;
  tag_name: string;
  assets: GitHubAsset[];
}

export function AutoUpdater() {
  const hasChecked = useRef(false);
  const progressListener = useRef<{ remove: () => Promise<void> } | null>(null);

  const [showProgressModal, setShowProgressModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMessage, setDownloadMessage] = useState("Preparando descarga...");
  const [releaseName, setReleaseName] = useState("");

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
        if (isNaN(localBuild)) {
          console.warn("AutoUpdater: No se pudo determinar el build local.", info.build);
          return;
        }

        // 3. Consultar GitHub Releases
        const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
          headers: { "Accept": "application/vnd.github.v3+json" }
        });
        if (!res.ok) {
          console.error("AutoUpdater: Error al consultar GitHub Releases", res.status);
          return;
        }
        const release: GitHubRelease = await res.json();

        // El tag tiene formato v0.1.0-45 o simplemente v0.1.0
        const parts = release.tag_name.split("-");
        let cloudBuild = NaN;

        if (parts.length >= 2) {
          cloudBuild = parseInt(parts[parts.length - 1], 10);
        } else {
          console.warn("AutoUpdater: El tag no sigue el formato vX.Y.Z-BUILD", release.tag_name);
          return;
        }

        if (isNaN(cloudBuild)) return;

        // 4. Comparar versiones
        if (cloudBuild > localBuild) {
          // Buscar el archivo APK en los assets del release
          const apkAsset = release.assets?.find((asset) => asset.name.endsWith(".apk"));
          if (!apkAsset) {
            console.warn("AutoUpdater: No se encontró un asset APK en el release.");
            return;
          }

          // 5. Preguntar al usuario si desea actualizar
          const { value } = await Dialog.confirm({
            title: "Actualización Disponible",
            message: `Hay una nueva versión de PrestaFácil (${release.name || release.tag_name}). ¿Deseas descargarla e instalarla ahora?`,
            okButtonTitle: "Actualizar",
            cancelButtonTitle: "Más tarde",
          });

          if (!value) return;

          setReleaseName(release.name || release.tag_name || "Nueva actualización");
          setDownloadProgress(0);
          setDownloadMessage("Iniciando descarga...");
          setShowProgressModal(true);

          progressListener.current = await UpdateInstaller.addListener(
            "downloadProgress",
            (event: DownloadProgressEvent) => {
              const progress = typeof event.percent === "number" ? event.percent : 0;
              
              if (progress >= 0) {
                setDownloadProgress(progress);
              }

              if (event.status === "downloading") {
                setDownloadMessage("Descargando actualización...");
              }

              if (event.status === "finished") {
                setDownloadProgress(100);
                setDownloadMessage("Abriendo instalador...");
              }

              if (event.status === "error") {
                setDownloadMessage(event.message || "No se pudo descargar la actualización.");
                setTimeout(() => setShowProgressModal(false), 5000);
              }
            }
          );

          try {
            const result = await UpdateInstaller.downloadAndInstall({
              url: apkAsset.browser_download_url,
              fileName: apkAsset.name,
            });

            if (result.success) {
              setDownloadProgress(100);
              setDownloadMessage("Instalador abierto. Finaliza la instalación para continuar.");
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "No se pudo iniciar la instalación";
            console.error("AutoUpdater: Error en downloadAndInstall", err);
            setDownloadMessage(`Error: ${errorMessage}`);
            setTimeout(() => setShowProgressModal(false), 5000);
          } finally {
            if (progressListener.current) {
              await progressListener.current.remove();
              progressListener.current = null;
            }
            // No cerramos el modal inmediatamente para que el usuario vea el mensaje final
            setTimeout(() => setShowProgressModal(false), 8000);
          }
        }
      } catch (error) {
        console.error("AutoUpdater Error:", error);
      }
    };

    checkForUpdates();

    return () => {
      if (progressListener.current) {
        progressListener.current.remove();
      }
    };
  }, []);

  return (
    <>
      {showProgressModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">Actualización en progreso</p>
              <h2 className="text-lg font-bold text-white">{releaseName}</h2>
              <p className="text-sm text-zinc-400">{downloadMessage}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Descarga</span>
                <span>{Math.round(downloadProgress)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${Math.min(downloadProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
