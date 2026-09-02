/**
 * Client-side utility functions for Admin and Public interactions.
 */

/**
 * Performs a JSON API request and parses response, throwing on error.
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data: any = isJson ? await response.json().catch(() => ({})) : null;

  if (!response.ok) {
    const message = (data && (data.error || data.message)) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

/**
 * Initializes modal close listeners (close button & cancel button).
 */
export function setupModalDismiss(
  modal: HTMLElement | null,
  closeBtn: HTMLElement | null,
  cancelBtn: HTMLElement | null
) {
  if (!modal) return;
  const close = () => modal.classList.remove("open");
  closeBtn?.addEventListener("click", close);
  cancelBtn?.addEventListener("click", close);
}

/**
 * Formats a local date and time with a specific timezone to a UTC ISO string.
 */
export function formatLocalToUtcString(
  localDate: string,
  localTime: string,
  timezone: string
): string {
  const localDateTime = `${localDate}T${localTime}:00`;
  const date = new Date(localDateTime + "Z");
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const formattedStr = `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}Z`;
    const formattedDate = new Date(formattedStr);
    const offsetMs = date.getTime() - formattedDate.getTime();
    return new Date(date.getTime() + offsetMs).toISOString();
  } catch {
    return new Date(localDateTime).toISOString();
  }
}
