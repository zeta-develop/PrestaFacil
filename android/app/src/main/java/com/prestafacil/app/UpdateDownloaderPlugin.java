package com.prestafacil.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "UpdateInstaller")
public class UpdateDownloaderPlugin extends Plugin {

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName", "prestafacil-update.apk");

        if (url == null || url.isEmpty()) {
            call.reject("URL no válida");
            return;
        }

        new Thread(() -> {
            File outputDir = new File(getContext().getCacheDir(), "updates");
            if (!outputDir.exists()) {
                outputDir.mkdirs();
            }

            File outputFile = new File(outputDir, fileName);
            if (outputFile.exists()) {
                outputFile.delete();
            }
            HttpURLConnection connection = null;

            try {
                URL downloadUrl = new URL(url);
                connection = (HttpURLConnection) downloadUrl.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(15000);
                connection.connect();

                int totalSize = connection.getContentLength();
                if (totalSize <= 0) totalSize = -1;

                try (InputStream inputStream = connection.getInputStream();
                     FileOutputStream outputStream = new FileOutputStream(outputFile)) {

                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    long downloaded = 0;
                    int lastProgress = 0;

                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                        downloaded += bytesRead;

                        if (totalSize != -1) {
                            int progress = (int) ((downloaded * 100) / totalSize);
                            if (progress != lastProgress) {
                                lastProgress = progress;
                                notifyProgress(progress, downloaded, (long) totalSize);
                            }
                        } else {
                            // Si no conocemos el tamaño total, notificamos progreso basado en bytes descargados
                            notifyProgress(-1, downloaded, -1L);
                        }
                    }
                    outputStream.flush();
                }

                notifyFinished(downloaded, (long) totalSize);

                Activity activity = getActivity();
                if (activity == null) {
                    call.reject("Actividad no disponible");
                    return;
                }

                Uri apkUri = FileProvider.getUriForFile(
                    activity,
                    activity.getPackageName() + ".fileprovider",
                    outputFile
                );

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);

                activity.runOnUiThread(() -> {
                    try {
                        activity.startActivity(intent);
                        JSObject result = new JSObject();
                        result.put("success", true);
                        result.put("filePath", outputFile.getAbsolutePath());
                        call.resolve(result);
                    } catch (Exception e) {
                        call.reject("Error al iniciar el instalador: " + e.getMessage());
                    }
                });

            } catch (Exception e) {
                notifyError(e.getMessage());
                call.reject(e.getMessage());
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }

    private void notifyProgress(int percent, long downloaded, long total) {
        JSObject progressData = new JSObject();
        progressData.put("percent", percent);
        progressData.put("downloaded", downloaded);
        progressData.put("total", total);
        progressData.put("status", "downloading");
        notifyListeners("downloadProgress", progressData, true);
    }

    private void notifyFinished(long downloaded, long total) {
        JSObject doneData = new JSObject();
        doneData.put("percent", 100);
        doneData.put("downloaded", downloaded);
        doneData.put("total", total);
        doneData.put("status", "finished");
        notifyListeners("downloadProgress", doneData, true);
    }

    private void notifyError(String message) {
        JSObject errorData = new JSObject();
        errorData.put("message", message);
        errorData.put("status", "error");
        notifyListeners("downloadProgress", errorData, true);
    }
}
