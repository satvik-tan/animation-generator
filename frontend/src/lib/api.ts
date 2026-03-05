/**
 * Format backend error messages to be more user-friendly
 */
function formatErrorMessage(statusCode: number, detail?: string): string {
  // Status-specific messages
  const statusMessages: Record<number, string> = {
    400: "The request was invalid. Please check your input and try again.",
    401: "You need to sign in to perform this action.",
    403: "You don't have permission to perform this action.",
    404: "The requested resource was not found.",
    429: "Too many requests. Please wait a moment and try again.",
    500: "Server error. Our team has been notified. Please try again later.",
    503: "Service temporarily unavailable. Please try again in a few moments.",
  };

  const baseMessage = statusMessages[statusCode] || "An unexpected error occurred.";
  
  // Add technical detail if available, but keep it concise
  if (detail && detail.length < 100) {
    return `${baseMessage} (${detail})`;
  }
  
  return baseMessage;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface JobResponse {
  job_id: string;
  status: string;
  result_url?: string;
  error_message?: string;
  prompt?: string;
  parent_job_id?: string | null;
  created_at: string;
}

export interface CreateJobRequest {
  prompt: string;
  parent_job_id?: string | null;
  custom_api_key?: string | null;
  model_provider?: 'gemini' | 'groq';
}

export async function createJob(
  req: CreateJobRequest,
  token: string | null
): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = formatErrorMessage(res.status, errorData.detail);
    throw new Error(message);
  }

  return res.json();
}

export async function getJob(
  jobId: string,
  getToken: () => Promise<string | null>
): Promise<JobResponse> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = formatErrorMessage(res.status, errorData.detail);
    throw new Error(message);
  }

  return res.json();
}

export async function listJobs(token: string | null): Promise<JobResponse[]> {
  const res = await fetch(`${API_BASE}/jobs`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = formatErrorMessage(res.status, errorData.detail);
    throw new Error(message);
  }

  return res.json();
}

export async function pollJob(
  jobId: string,
  getToken: () => Promise<string | null>,
  intervalMs: number = 2000,
  onUpdate?: (job: JobResponse) => void
): Promise<JobResponse> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const job = await getJob(jobId, getToken);
        
        if (onUpdate) {
          onUpdate(job);
        }

        if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
          resolve(job);
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (err) {
        reject(err);
      }
    };

    poll();
  });
}

export async function cancelJob(
  jobId: string,
  token: string | null
): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: "PATCH",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = formatErrorMessage(res.status, errorData.detail);
    throw new Error(message);
  }

  return res.json();
}

export async function regenerateVideoUrl(
  jobId: string,
  token: string | null
): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/regenerate-url`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = formatErrorMessage(res.status, errorData.detail);
    throw new Error(message);
  }

  return res.json();
}

/**
 * Check if a video URL is likely expired (older than 55 minutes).
 * S3 pre-signed URLs expire after 1 hour.
 */
export function isUrlLikelyExpired(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const ageMinutes = (now - created) / (1000 * 60);
  return ageMinutes > 55; // Refresh if older than 55 minutes
}
