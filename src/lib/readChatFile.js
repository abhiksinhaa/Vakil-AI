const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function readFileForChat(file) {
  if (!file) throw new Error('No file selected');
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File too large. Maximum size is 8 MB.');
  }

  const name = file.name || 'document';
  const lower = name.toLowerCase();

  if (lower.endsWith('.txt') || file.type === 'text/plain') {
    const text = await file.text();
    return {
      fileName: name,
      mimeType: 'text/plain',
      textContent: text.slice(0, 120000),
      inlineData: null,
    };
  }

  if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
    const base64 = await fileToBase64(file);
    return {
      fileName: name,
      mimeType: 'application/pdf',
      textContent: `[Attached PDF: ${name}]`,
      inlineData: { mime_type: 'application/pdf', data: base64 },
    };
  }

  throw new Error('Supported formats: PDF and TXT only.');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}
