import { registerPlugin } from "@capacitor/core";

export interface DownloadProgressEvent {
  downloaded?: number;
  total?: number;
  percent?: number;
  status?: "downloading" | "finished" | "error";
  message?: string;
}

export interface UpdateInstallerPlugin {
  downloadAndInstall(options: { url: string; fileName: string }): Promise<{ success: boolean; filePath?: string }>;
  addListener(
    eventName: "downloadProgress",
    listenerFunc: (event: DownloadProgressEvent) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

export const UpdateInstaller = registerPlugin<UpdateInstallerPlugin>("UpdateInstaller");