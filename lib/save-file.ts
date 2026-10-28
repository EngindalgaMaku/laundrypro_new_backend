// Hands a generated file (CSV, invoice HTML) to the user. In the browser it downloads;
// inside the Android app a blob/anchor download does nothing (the WebView has no download
// handler), so the file is written to the app cache and offered through the share sheet,
// from where it can be saved to Files/Drive or sent by WhatsApp or e-mail.

export async function saveFile({
  fileName,
  content,
  mimeType,
}: {
  fileName: string;
  content: string;
  mimeType: string;
}): Promise<"downloaded" | "shared" | "cancelled"> {
  const { Capacitor } = await import("@capacitor/core");

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const written = await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({ title: fileName, files: [written.uri], dialogTitle: "Dosyayı kaydet veya paylaş" });
      return "shared";
    } catch (error) {
      // closing the share sheet rejects; that is not a failure
      if (String((error as Error)?.message || error).toLowerCase().includes("cancel")) return "cancelled";
      throw error;
    }
  }

  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return "downloaded";
}
