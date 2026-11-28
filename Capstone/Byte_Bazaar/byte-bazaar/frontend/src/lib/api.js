let token;
export async function api(path, method = "GET", body) {
  if (method !== "GET" && !token) {
    token = (await api("/csrf")).token;
  }
  const res = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(method !== "GET" ? { "X-XSRF-TOKEN": token } : {}),
    },
    ...(body
      ? { body: body instanceof FormData ? body : JSON.stringify(body) }
      : {}),
  });
  if (!res.ok) {
    let data = await res.json().catch(() => ({}));
    throw Error(data.message || "Request failed (" + res.status + ")");
  }
  return res.status === 204
    ? null
    : res.text().then((t) => (t ? JSON.parse(t) : null));
}
