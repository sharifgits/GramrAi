export interface DriveUser {
  id: string;
  name: string;
  picture: string;
  email?: string;
}

export async function getAuthUrl(): Promise<string> {
  const res = await fetch('/api/auth/url');
  const data = await res.json();
  return data.url;
}

const getAuthHeaders = () => {
  const tokens = localStorage.getItem('google_auth_tokens');
  return tokens ? { 'Authorization': `Bearer ${tokens}` } : {};
};

export async function getUserProfile(): Promise<DriveUser | null> {
  try {
    const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function logoutDrive(): Promise<void> {
  localStorage.removeItem('google_auth_tokens');
  await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
}

export async function uploadFileToDrive(fileName: string, fileContent: string, mimeType?: string) {
  const res = await fetch('/api/drive/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      fileName,
      fileContent,
      mimeType,
    }),
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to upload to Drive');
  }
  
  return await res.json();
}
