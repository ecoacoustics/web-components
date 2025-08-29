// Firefox doesn't support the showSaveFilePicker API, therefore, on Firefox
// we have to create a clickable link and simulating a click
// TODO: remove this once Firefox ESR supports the showSaveFilePicker API
// https://caniuse.com/?search=showSaveFilePicker
export async function downloadFile(file: File) {
  if (typeof window.showSaveFilePicker === "function") {
    try {
      const saveFileHandle = await window.showSaveFilePicker({ suggestedName: file.name });
      const writableStream = await saveFileHandle.createWritable();

      await writableStream.write(file);
      await writableStream.close();
    } catch (error: any) {
      // Fail silently if the user has simply canceled the dialog.
      if (error.name !== "AbortError") {
        console.error(error.name, error.message);
        return;
      }
    }
  } else {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.download = file.name;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }
}
