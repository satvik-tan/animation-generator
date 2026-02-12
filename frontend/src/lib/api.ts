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
    throw new Error(errorData.detail || `Failed to create job: ${res.statusText}`);
  }

  return res.json();
}

export async function getJob(
  jobId: string,
  token: string | null
): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch job: ${res.statusText}`);
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
    throw new Error(errorData.detail || `Failed to list jobs: ${res.statusText}`);
  }

  return res.json();
}

export async function pollJob(
  jobId: string,
  token: string | null,
  intervalMs: number = 2000,
  onUpdate?: (job: JobResponse) => void
): Promise<JobResponse> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const job = await getJob(jobId, token);
        
        if (onUpdate) {
          onUpdate(job);
        }

        if (job.status === "completed" || job.status === "failed") {
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
