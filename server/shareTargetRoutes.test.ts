import express from "express";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SHARE_MAX_AGE_MS } from "@shared/shareTarget";
import {
  createShareInbox,
  registerShareTargetRoutes,
} from "./shareTargetRoutes";

let server: Server;
let origin: string;
const inbox = createShareInbox();

beforeAll(async () => {
  const app = express();
  registerShareTargetRoutes(app, inbox);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(() => {
  inbox.clear();
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(err => (err ? reject(err) : resolve()))
  );
});

async function postShare(init: {
  file?: File;
  cookie?: string;
  fields?: Record<string, string>;
}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(init.fields ?? {})) {
    form.set(key, value);
  }
  if (init.file) form.set("photo", init.file);
  return fetch(`${origin}/share-target`, {
    method: "POST",
    body: form,
    redirect: "manual",
    headers: init.cookie ? { cookie: init.cookie } : undefined,
  });
}

describe("POST /share-target fallback", () => {
  it("stores the photo and resolves a signed-in visitor to the dashboard", async () => {
    const bytes = Uint8Array.from([137, 80, 78, 71, 4, 5, 6]);
    const posted = await postShare({
      file: new File([bytes], "deck.png", { type: "image/png" }),
      cookie: "theme=light; app_session_id=signed-in",
      fields: { title: "Deck", text: "Finished", url: "https://example.com" },
    });
    expect(posted.status).toBe(303);
    expect(posted.headers.get("cache-control")).toBe("no-store");
    const openedLocation = posted.headers.get("location");
    expect(openedLocation).toMatch(
      /^\/share-target\/open\?sid=[A-Za-z0-9_-]+$/
    );

    const opened = await fetch(new URL(openedLocation!, origin), {
      redirect: "manual",
      headers: { cookie: "app_session_id=signed-in" },
    });
    expect(opened.status).toBe(303);
    expect(opened.headers.get("cache-control")).toBe("no-store");
    expect(opened.headers.get("vary")).toContain("Cookie");
    const landing = opened.headers.get("location");
    expect(landing).toMatch(/^\/dashboard\?shared=1&sid=[A-Za-z0-9_-]+$/);

    const sid = new URL(landing!, origin).searchParams.get("sid");
    const image = await fetch(`${origin}/share-target/image/${sid}`);
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect(image.headers.get("cache-control")).toBe("no-store");
    expect(image.headers.get("x-share-filename")).toBe("deck.png");
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(bytes);

    const again = await fetch(`${origin}/share-target/image/${sid}`);
    expect(again.status).toBe(404);
  });

  it("sends a signed-out share to the preview page", async () => {
    const posted = await postShare({
      file: new File([Uint8Array.from([1, 2])], "job.jpg", {
        type: "image/jpeg",
      }),
    });
    const opened = await fetch(
      new URL(posted.headers.get("location")!, origin),
      {
        redirect: "manual",
      }
    );
    expect(opened.headers.get("location")).toMatch(
      /^\/preview\?shared=1&sid=[A-Za-z0-9_-]+$/
    );
  });

  it("still redirects when the share has no photo", async () => {
    const posted = await postShare({ fields: { text: "Just a note" } });
    expect(posted.status).toBe(303);
    expect(posted.headers.get("location")).toBe("/share-target/open");
    const opened = await fetch(new URL("/share-target/open", origin), {
      redirect: "manual",
    });
    expect(opened.headers.get("location")).toBe("/preview?shared=1");
  });

  it("drops an expired share", () => {
    let now = 1_000;
    const timed = createShareInbox(() => now);
    const id = timed.put({
      buffer: Buffer.from("photo"),
      type: "image/jpeg",
      name: "job.jpg",
    });
    now += SHARE_MAX_AGE_MS + 1;
    expect(timed.take(id)).toBeNull();
  });
});
