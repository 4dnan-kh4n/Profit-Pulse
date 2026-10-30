// The API address comes from VITE_API_URL (see .env.example). It includes the /api part.
const configured = (import.meta.env.VITE_API_URL || '').trim();
// Production serves the website and API from one Embarko app. Local Vite keeps its separate API URL.
export const API_URL = (configured || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')).replace(/\/+$/, '');
