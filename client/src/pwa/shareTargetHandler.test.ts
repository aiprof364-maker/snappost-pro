import { describe, expect, it } from "vitest";
import { handleShareTargetRequest } from "./shareTargetHandler";

describe("share target service worker handler", () => {
  it("stores a readable photo and redirects without calling the network", async () => {
    const form = new FormData();
    form.set("title", "Deck");
    form.set("text", "Done");
    form.set(
      "photo",
      new File([Uint8Array.from([9, 8, 7])], "deck.jpg", {
        type: "image/jpeg",
      })
    );
    const request = new Request("https://snappostpro.com/share-target", {
      method: "POST",
      body: form,
    });
    const saved: File[] = [];
    let forwarded = 0;
    const response = await handleShareTargetRequest(request, {
      save: async file => {
        saved.push(file);
      },
      forward: async () => {
        forwarded += 1;
        return new Response("unused");
      },
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://snappostpro.com/share-target/open"
    );
    expect(saved.map(file => file.name)).toEqual(["deck.jpg"]);
    expect(new Uint8Array(await saved[0].arrayBuffer())).toEqual(
      Uint8Array.from([9, 8, 7])
    );
    expect(forwarded).toBe(0);
  });

  it("forwards the original POST when the worker cannot read the file", async () => {
    const request = {
      url: "https://snappostpro.com/share-target",
      clone() {
        return {
          formData: async () => {
            throw new TypeError("Failed to fetch");
          },
        };
      },
    } as unknown as Request;

    let forwarded = 0;
    const response = await handleShareTargetRequest(request, {
      save: async () => {
        throw new Error("should not save");
      },
      forward: async () => {
        forwarded += 1;
        return Response.redirect(
          "https://snappostpro.com/preview?shared=1&sid=abcdefghij1234",
          302
        );
      },
    });

    expect(forwarded).toBe(1);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://snappostpro.com/preview?shared=1&sid=abcdefghij1234"
    );
  });
});
