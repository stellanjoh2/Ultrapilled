type DirectoryPicker = {
  showDirectoryPicker: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};

function pickerWindow(): DirectoryPicker | null {
  const win = window as Window & Partial<DirectoryPicker>;
  return typeof win.showDirectoryPicker === "function" ? (win as DirectoryPicker) : null;
}

export function canPickFrameFolder(): boolean {
  return Boolean(pickerWindow());
}

/** User-gesture folder pick. `null` if cancelled or the picker is missing. */
export async function pickFrameFolder(): Promise<FileSystemDirectoryHandle | null> {
  const win = pickerWindow();
  if (!win) return null;
  try {
    return await win.showDirectoryPicker({ mode: "readwrite" });
  } catch {
    return null;
  }
}

export async function writeFrameFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  blob: Blob,
): Promise<void> {
  const file = await dir.getFileHandle(name, { create: true });
  const stream = await file.createWritable();
  await stream.write(blob);
  await stream.close();
}
