// Firefox doesn't support the showSaveFilePicker API, therefore, on Firefox
// we have to create a clickable link and simulating a click
// TODO: remove this once Firefox ESR supports the showSaveFilePicker API
// https://caniuse.com/?search=showSaveFilePicker
export async function downloadFile(file: File) {
  const supportsSaveFile = "showSaveFilePicker" in window;
  if (supportsSaveFile) {
    const saveFileHandle = await (window as any).showSaveFilePicker({ suggestedName: file.name });
    const writableStream = await saveFileHandle.createWritable();

    await writableStream.write(file);
    await writableStream.close();
  } else {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.download = file.name;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }
}
