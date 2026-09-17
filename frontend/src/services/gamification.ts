export interface UserSessionFeedback {
  viewersAnalyzedCount: number;
  discoveredSegmentIds: number[];
  lastDiscoveredSegmentId: number | null;
}

const STORAGE_KEY = 'spectra_session_feedback';

export function getSessionFeedback(): UserSessionFeedback {
  if (typeof window === 'undefined') {
    return {
      viewersAnalyzedCount: 0,
      discoveredSegmentIds: [],
      lastDiscoveredSegmentId: null,
    };
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }

  const initial: UserSessionFeedback = {
    viewersAnalyzedCount: 0,
    discoveredSegmentIds: [],
    lastDiscoveredSegmentId: null,
  };
  saveSessionFeedback(initial);
  return initial;
}

function saveSessionFeedback(state: UserSessionFeedback): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('spectra-session-update', { detail: state }));
  }
}

export function recordViewerAnalysis(segmentId: number): {
  isNewSegment: boolean;
  totalAnalyzed: number;
  discoveredCount: number;
} {
  const state = getSessionFeedback();
  state.viewersAnalyzedCount += 1;

  let isNewSegment = false;
  if (!state.discoveredSegmentIds.includes(segmentId)) {
    state.discoveredSegmentIds.push(segmentId);
    state.lastDiscoveredSegmentId = segmentId;
    isNewSegment = true;
  }

  saveSessionFeedback(state);

  return {
    isNewSegment,
    totalAnalyzed: state.viewersAnalyzedCount,
    discoveredCount: state.discoveredSegmentIds.length,
  };
}
