import { debounce } from '@/lib/utils';

const DRAFT_KEY = 'booking_draft';
const EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export function saveDraft(data: any, userId: string) {
  const draft = { ...data, user_id: userId, lastSaved: Date.now() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function debouncedSaveDraft(data: any, userId: string) {
  return debounce(() => saveDraft(data, userId), 500)();
}

export function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    return draft;
  } catch {
    return null;
  }
}

export function loadDraftForUser(currentUserId: string) {
  const draft = loadDraft();
  if (!draft) return null;
  if (draft.user_id !== currentUserId) {
    clearDraft();
    console.log('Draft cleared: user mismatch');
    return null;
  }
  if (isDraftExpired(draft)) {
    clearDraft();
    return null;
  }
  return draft;
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export function isDraftExpired(draft: any) {
  if (!draft || !draft.lastSaved) return true;
  return Date.now() - draft.lastSaved > EXPIRY_MS;
}

// Optional React hook for banner logic
export function useBookingDraftBanner() {
  const draft = loadDraft();
  if (!draft || isDraftExpired(draft)) {
    clearDraft();
    return { show: false };
  }
  return { show: true, draft };
} 