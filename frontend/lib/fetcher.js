import api from "@/lib/api";

// Generic GET fetcher for SWR. Takes a URL (relative to the /bff base) and
// returns the unwrapped `data` payload. Goes through the shared axios instance,
// so it inherits the Bearer token, CSRF header, and the same-origin /bff proxy.
export const fetcher = (url) => api.get(url).then((res) => res.data.data);
