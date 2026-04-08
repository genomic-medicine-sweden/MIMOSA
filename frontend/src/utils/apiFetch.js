export async function apiFetch(url, options = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (res.status === 401) {
    localStorage.removeItem("user");
    window.location.href = "/login";
    return null;
  }
  return res;
}
