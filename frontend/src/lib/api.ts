// API client for backend
// Frontend adapts to backend routes defined in backend/main.py and conversation router

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';

function getAuthHeader() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ConversationOut {
  id: number;
  title: string;
  created_at: string;
}

export interface MessageOut {
  id: number;
  role: string;
  content: string;
  created_at: string;
}

export interface AskResponse {
  response: string; // matches backend /ask/{conversation_id} -> {response}
}

export interface AskPdfResponse {
  answer: string; // matches backend /ask_pdf/{conversation_id} -> {answer}
}

async function parseJSON(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text || '{}');
  } catch {
    return text;
  }
}

async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const body = await parseJSON(res);
    const message = body?.detail || body?.message || res.statusText || 'Request failed';
    throw new Error(message);
  }
  return parseJSON(res);
}

export async function signup(full_name: string, email: string, password: string) {
  return request('/authenticate/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name, email, password }),
  });
}

export async function login(email: string, password: string) {
  const body = await request('/authenticate/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  // backend returns { access_token, token_type, full_name, new_conversation_id }
  if (body.access_token) {
    localStorage.setItem('access_token', body.access_token);
    localStorage.setItem('full_name', body.full_name || '');
  }
  return body;
}

export function signOut() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('full_name');
}

export async function listConversations(): Promise<ConversationOut[]> {
  return request('/conversations/', {
    headers: { ...getAuthHeader() },
  });
}

export async function createConversation(title?: string): Promise<ConversationOut> {
  return request('/conversations/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ title }),
  });
}

export async function getConversation(conversationId: number) {
  return request(`/conversations/${conversationId}`, {
    headers: { ...getAuthHeader() },
  });
}

export async function getMessages(conversationId: number): Promise<MessageOut[]> {
  return request(`/conversations/${conversationId}/messages`, {
    headers: { ...getAuthHeader() },
  });
}

export async function addMessage(conversationId: number, role: string, content: string): Promise<MessageOut> {
  return request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ role, content }),
  });
}

export async function askWithHistory(conversationId: number, prompt: string): Promise<AskResponse> {
  return request(`/ask/${conversationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ prompt }),
  });
}

export async function askPdfWithHistory(
  conversationId: number,
  file: File,
  question: string,   // ✅ required
  top_k = 5
): Promise<AskPdfResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('question', question); // ✅ always sent
  form.append('top_k', String(top_k));

  const res = await fetch(`${API_BASE}/ask_pdf/${conversationId}`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
    body: form,
  });

  if (!res.ok) {
    const body = await parseJSON(res);
    throw new Error(body?.detail || body?.message || res.statusText);
  }

  return parseJSON(res);
}

export default {
  signup,
  login,
  signOut,
  listConversations,
  createConversation,
  getConversation,
  getMessages,
  addMessage,
  askWithHistory,
  askPdfWithHistory,
};
