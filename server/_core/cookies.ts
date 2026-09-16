import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const shouldSetDomain =
    hostname &&
    !LOCAL_HOSTS.has(hostname) &&
    !isIpAddress(hostname) &&
    hostname !== "127.0.0.1" &&
    hostname !== "::1";

  // Keep root and www sessions in one cookie scope. Without this normalization,
  // a session created on snappostpro.com can survive a logout requested from
  // www.snappostpro.com because the browser sees two different cookie domains.
  const normalizedHostname = hostname?.startsWith("www.")
    ? hostname.slice(4)
    : hostname;

  const domain =
    shouldSetDomain && normalizedHostname && !normalizedHostname.startsWith(".")
      ? `.${normalizedHostname}`
      : shouldSetDomain
        ? normalizedHostname
        : undefined;

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}
