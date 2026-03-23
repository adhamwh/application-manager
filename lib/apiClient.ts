"use client";

const ACCESS_TOKEN_STORAGE_KEY = "admin-man-access-token";

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? "";
}

export function setStoredAccessToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  window.dispatchEvent(new Event("admin-man-auth-changed"));
}

type ApiFetchOptions = RequestInit & {
  token?: string;
};

export async function apiFetch(input: string, init: ApiFetchOptions = {}) {
  const token = init.token ?? getStoredAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
