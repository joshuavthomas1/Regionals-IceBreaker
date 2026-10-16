export class ApiError extends Error {
  status: number;
  needCheckIn: boolean;

  constructor(message: string, status: number, needCheckIn = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.needCheckIn = needCheckIn;
  }
}

export function postJson<T>(url: string, body?: unknown) {
  return sendJson<T>(url, "POST", body);
}

export function patchJson<T>(url: string, body?: unknown) {
  return sendJson<T>(url, "PATCH", body);
}

export function deleteJson<T>(url: string) {
  return sendJson<T>(url, "DELETE");
}

async function sendJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Couldn't reach the floor. Check your connection and try again.", 0);
  }

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string; needCheckIn?: boolean })
    | null;

  if (!response.ok) {
    throw new ApiError(
      data?.error || "That didn't work. Try again.",
      response.status,
      Boolean(data?.needCheckIn),
    );
  }

  return data as T;
}
