// Backend configuration. Point API_BASE at your VPS.
// Use HTTPS — Chrome may block plain-HTTP fetches from the extension.
export const API_BASE = 'https://api.example.com';

export const ENDPOINTS = {
  newsletters: `${API_BASE}/api/newsletters`,
  pulse: `${API_BASE}/api/pulse`,
};
