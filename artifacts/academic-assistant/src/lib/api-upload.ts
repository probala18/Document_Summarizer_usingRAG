export async function uploadDocumentApi(file: File) {
  const token = localStorage.getItem('aa_token');
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }

  return res.json();
}