"use client";

import { useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Dialog } from "@capacitor/dialog";
import { Capacitor } from "@capacitor/core";
import { UpdateInstaller, type DownloadProgressEvent } from "@/plugins/updateInstaller";
import { Download, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  name: string;
  tag_name: string;
  assets: GitHubAsset[];
  body?: string;
}

function isAppVersionNewer(localVersion: string, cloudVersion: string): boolean {
  const cleanLocal = localVersion.replace(/^v/, "").trim();
  const cleanCloud = cloudVersion.replace(/^v/, "").trim();

  const [localVerPart, localBuildPart] = cleanLocal.split("-");
  const [cloudVerPart, cloudBuildPart] = cleanCloud.split("-");

  const localNums = localVerPart.split(".").map(n => parseInt(n, 10) || 0);
  const cloudNums = cloudVerPart.split(".").map(n => parseInt(n, 10) || 0);

  const maxLength = Math.max(localNums.length, cloudNums.length);
  for (let i = 0; i < maxLength; i++) {
    const localNum = localNums[i] || 0;
    const cloudNum = cloudNums[i] || 0;
    if (cloudNum > localNum) return true;
    if (cloudNum < localNum) return false;
  }

  if (cloudBuildPart && localBuildPart) {
    const localBuild = parseInt(localBuildPart, 10) || 0;
    const cloudBuild = parseInt(cloudBuildPart, 10) || 0;
    return cloudBuild > localBuild;
  }

  if (cloudBuildPart && !localBuildPart) {
    return true;
  }

  return false;
}

export function AutoUpdater() {
  const hasChecked = useRef(false);
  const progressListener = useRef<{ remove: () => Promise<void> } | null>(null);

  const [showProgressModal, setShowProgressModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<"downloading" | "completed" | "error" | "preparing">("preparing");
  const [downloadMessage, setDownloadMessage] = useState("Preparando descarga...");
  const [releaseName, setReleaseName] = useState("");

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkForUpdates = async () => {
      if (!Capacitor.isNativePlatform()) return;

      const repo = "zeta-develop/PrestaFacil";

      try {
        const info = await App.getInfo();
        const localFullVersion = `${info.version}-${info.build}`;

        const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
          headers: { "Accept": "application/vnd.github.v3+json" }
        });
        if (!res.ok) {
          console.error("AutoUpdater: Error al consultar GitHub Releases", res.status);
          return;
        }
        const release: GitHubRelease = await res.json();

        const hasUpdate = isAppVersionNewer(localFullVersion, release.tag_name);

        if (hasUpdate) {
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
          setDownloadStatus("preparing");
          setDownloadMessage("Iniciando descarga...");
          setShowProgressModal(true);

          progressListener.current = await UpdateInstaller.addListener(
            "downloadProgress",
            (event: DownloadProgressEvent) => {
              const progressVal = typeof event.percent === "number" ? event.percent : 0;
              
              if (progressVal >= 0) {
                setDownloadProgress(progressVal);
              }

              if (event.status === "downloading") {
                setDownloadStatus("downloading");
                setDownloadMessage("Descargando actualización...");
              }

              if (event.status === "finished") {
                setDownloadStatus("completed");
                setDownloadProgress(100);
                setDownloadMessage("Abriendo instalador nativo...");
              }

              if (event.status === "error") {
                setDownloadStatus("error");
                setDownloadMessage(event.message || "No se pudo descargar la actualización.");
              }
            }
          );

          try {
            const result = await UpdateInstaller.downloadAndInstall({
              url: apkAsset.browser_download_url,
              fileName: apkAsset.name,
            });

            if (result.success) {
              setDownloadStatus("completed");
              setDownloadProgress(100);
              setDownloadMessage("Instalador abierto. Finaliza la instalación para continuar.");
            }
          } catch (err) {
            setDownloadStatus("error");
            console.error("AutoUpdater: Error en downloadAndInstall", err);
            setDownloadMessage("No se pudo iniciar la instalación");
          } finally {
            if (progressListener.current) {
              await progressListener.current.remove();
              progressListener.current = null;
            }
            // Mantenemos el modal abierto un breve momento tras completado o con error
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden text-center text-white animate-in zoom-in-95 duration-300">
            
            {/* Decorative ambient light */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-teal-500/20 blur-[60px] rounded-full pointer-events-none"></div>
            
            <div className="space-y-6 relative z-10 py-2">
              
              {/* Dinamic icon based on download status */}
              {downloadStatus === "preparing" && (
                <div className="mx-auto h-16 w-16 rounded-3xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Download size={32} className="animate-bounce" />
                </div>
              )}

              {downloadStatus === "downloading" && (
                <div className="mx-auto h-16 w-16 rounded-3xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <RefreshCw size={32} className="animate-spin" />
                </div>
              )}

              {downloadStatus === "completed" && (
                <div className="mx-auto h-16 w-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse">
                  <CheckCircle size={32} />
                </div>
              )}

              {downloadStatus === "error" && (
                <div className="mx-auto h-16 w-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <AlertCircle size={32} />
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-3 py-1 rounded-full">Actualización en Progreso</span>
                <h2 className="text-xl font-bold text-white tracking-tight pt-2">{releaseName}</h2>
                <p className="text-sm text-zinc-400 pt-1">{downloadMessage}</p>
              </div>

              {/* Progress bar container */}
              <div className="space-y-2">
                <div className="h-3 w-full bg-black/40 border border-zinc-800 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                    style={{ width: `${Math.min(downloadProgress, 100)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 font-bold px-1">
                  <span>Descarga</span>
                  <span className="text-base text-teal-400 font-black">{Math.round(downloadProgress)}%</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
