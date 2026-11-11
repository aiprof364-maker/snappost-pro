import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  Link: (props: { href?: string; children?: React.ReactNode }) =>
    React.createElement("a", { href: props.href }, props.children),
}));

vi.mock("lucide-react", () => ({
  Loader2: () => null,
  Mail: () => null,
  ShieldCheck: () => null,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      requestSignInLink: {
        useMutation: () => ({ mutate: () => undefined, isPending: false }),
      },
      requestAdminAccessLink: {
        useMutation: () => ({ mutate: () => undefined, isPending: false }),
      },
    },
  },
}));

vi.mock("@/lib/metaPixel", () => ({ trackMetaEvent: vi.fn() }));
vi.mock("@/lib/googleAnalytics", () => ({
  trackGoogleAnalyticsEvent: vi.fn(),
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: { children?: React.ReactNode; type?: string }) =>
    React.createElement("button", { type: props.type }, props.children),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: { placeholder?: string; type?: string }) =>
    React.createElement("input", {
      placeholder: props.placeholder,
      type: props.type,
    }),
}));

const location = {
  search: "",
  origin: "https://snappostpro.com",
};

function buttonText(html: string) {
  return [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map(
    match => match[1]
  );
}

async function renderLogin(search: string) {
  location.search = search;
  const { default: Login } = await import("./Login");
  return renderToStaticMarkup(React.createElement(Login));
}

beforeEach(() => {
  vi.stubGlobal("window", {
    location,
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
  });
});

describe("expired access link page", () => {
  it("shows a free user how to request a new link", async () => {
    const html = await renderLogin("?error=expired-link");

    expect(html).toContain("That link has expired");
    expect(html).toContain("works for 24 hours");
    expect(html).toContain("more than once");
    expect(html).toContain("getting called away will not lock you out");
    expect(html).toContain("This link has finished.");
    expect(html).toContain("Enter your email below and we’ll send a new one.");
    expect(html).toContain("you@yourbusiness.com");
    expect(buttonText(html)).toContain("Email me a new access link");
    expect(html).not.toContain("15 minutes");
    expect(html).not.toContain("can only be used once");
    expect(html).not.toContain("one-time");
  });

  it("offers the admin inbox a new link without asking for an email address", async () => {
    const html = await renderLogin("?error=expired-link&next=%2Fadmin");

    expect(html).toContain("That link has expired");
    expect(html).toContain("Send a new link to the admin inbox.");
    expect(buttonText(html)).toContain("Send a new admin access link");
    expect(html).not.toContain("you@yourbusiness.com");
    expect(html).not.toContain("Enter your email below");
  });

  it("keeps a broken link on a page that can send a replacement", async () => {
    const html = await renderLogin("?error=invalid-link");

    expect(html).toContain("That link did not work");
    expect(html).toContain("Request a new one and open it when you are ready.");
    expect(buttonText(html)).toContain("Email me a new access link");
    expect(html).toContain("you@yourbusiness.com");
  });

  it("still invites a new free user to request their first link", async () => {
    const html = await renderLogin("");

    expect(html).toContain("Start your 3 free posts");
    expect(html).toContain("stays active for 24 hours");
    expect(html).toContain("open it more than once");
    expect(buttonText(html)).toContain("Send my free access link");
    expect(html).not.toContain("That link has expired");
  });

  it("does not tell the preview page that the link dies in 15 minutes", () => {
    const source = readFileSync(
      new URL("./FreePreview.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("ACCESS_LINK_LIFETIME_LABEL");
    expect(source).toContain("more than once");
    expect(source).not.toContain("15 minutes");
  });
});
