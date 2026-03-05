// User limits and custom API key management (localStorage-based, no DB)

const STORAGE_KEYS = {
  JOB_COUNT: 'animation_job_count',
  CUSTOM_GEMINI_KEY: 'custom_gemini_api_key',
  SELECTED_MODEL: 'selected_model',
} as const;

const FREE_LIMIT = 3;

export type ModelProvider = 'gemini' | 'groq';

/**
 * Get the current job count for this user
 */
export function getJobCount(): number {
  const count = localStorage.getItem(STORAGE_KEYS.JOB_COUNT);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Increment the job count
 */
export function incrementJobCount(): number {
  const newCount = getJobCount() + 1;
  localStorage.setItem(STORAGE_KEYS.JOB_COUNT, newCount.toString());
  return newCount;
}

/**
 * Check if user has reached the free limit
 */
export function hasReachedLimit(): boolean {
  return getJobCount() >= FREE_LIMIT;
}

/**
 * Get remaining free jobs
 */
export function getRemainingJobs(): number {
  return Math.max(0, FREE_LIMIT - getJobCount());
}

/**
 * Get custom Gemini API key
 */
export function getCustomGeminiKey(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CUSTOM_GEMINI_KEY);
}

/**
 * Set custom Gemini API key
 */
export function setCustomGeminiKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_GEMINI_KEY, key);
}

/**
 * Clear custom Gemini API key
 */
export function clearCustomGeminiKey(): void {
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_GEMINI_KEY);
}

/**
 * Check if user has a custom API key set
 */
export function hasCustomGeminiKey(): boolean {
  const key = getCustomGeminiKey();
  return key !== null && key.trim().length > 0;
}

/**
 * Get selected model provider
 */
export function getSelectedModel(): ModelProvider {
  const model = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
  return (model as ModelProvider) || 'gemini';
}

/**
 * Set selected model provider
 */
export function setSelectedModel(model: ModelProvider): void {
  localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, model);
}

/**
 * Check if user can create a new job
 * Returns { canCreate: boolean, reason?: string }
 */
export function canCreateJob(): { canCreate: boolean; reason?: string } {
  const selectedModel = getSelectedModel();
  
  // Groq is always free, no limits
  if (selectedModel === 'groq') {
    return { canCreate: true };
  }
  
  // Gemini: check limits
  if (hasReachedLimit() && !hasCustomGeminiKey()) {
    return {
      canCreate: false,
      reason: `You've reached the free limit (${FREE_LIMIT} animations). Please add your own Gemini API key to continue.`,
    };
  }
  
  return { canCreate: true };
}
