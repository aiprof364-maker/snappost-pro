import { MAX_SHARE_BYTES } from "@shared/shareTarget";
import { describe, expect, it } from "vitest";
import {
  acceptPickedPhoto,
  consumeSharedPhoto,
  fileFromStoredShare,
  loadSharedPhoto,
  type StoredShare,
} from "./sharedPhoto";

function stored(contents: string, name: string, type: string): StoredShare {
  return {
    blob: new Blob([contents], { type }),
    name,
    type,
  };
}

describe("shared photo preload", () => {
  it("turns the stored share into the file the upload flow already accepts", async () => {
    let reads = 0;
    const file = await loadSharedPhoto("?shared=1&landing=hairdressers", {
      readStored: async () => {
        reads += 1;
        return stored("jpeg-bytes", "job.jpg", "image/jpeg");
      },
      fetchServerShare: async () => {
        throw new Error("no server id");
      },
    });

    expect(reads).toBe(1);
    expect(file).toBeInstanceOf(File);
    expect(file?.name).toBe("job.jpg");
    expect(file?.type).toBe("image/jpeg");
    expect(await file?.text()).toBe("jpeg-bytes");
    expect(acceptPickedPhoto(file, 8 * 1024 * 1024)).toBe(file);
  });

  it("does nothing unless this navigation is a share", async () => {
    let reads = 0;
    const file = await loadSharedPhoto("?landing=contractors", {
      readStored: async () => {
        reads += 1;
        return stored("x", "job.jpg", "image/jpeg");
      },
      fetchServerShare: async () => stored("y", "server.jpg", "image/jpeg"),
    });
    expect(file).toBeNull();
    expect(reads).toBe(0);
  });

  it("prefers the server copy and still clears the device copy", async () => {
    let deviceReads = 0;
    const file = await loadSharedPhoto("?shared=1&sid=abcdefghij1234", {
      fetchServerShare: async id => {
        expect(id).toBe("abcdefghij1234");
        return stored("server", "from-server.png", "image/png");
      },
      readStored: async () => {
        deviceReads += 1;
        return stored("device", "device.jpg", "image/jpeg");
      },
    });
    expect(file?.name).toBe("from-server.png");
    expect(await file?.text()).toBe("server");
    expect(deviceReads).toBe(1);
  });

  it("uses the device copy when the server share is already gone", async () => {
    const file = await loadSharedPhoto("?shared=1&sid=abcdefghij1234", {
      fetchServerShare: async () => {
        throw new Error("missing");
      },
      readStored: async () => stored("device", "device.jpg", "image/jpeg"),
    });
    expect(await file?.text()).toBe("device");
  });

  it("rejects an empty or oversized stored photo", () => {
    expect(
      fileFromStoredShare({
        blob: new Blob([]),
        name: "empty.jpg",
        type: "image/jpeg",
      })
    ).toBeNull();
    expect(
      fileFromStoredShare({
        blob: new Blob([new Uint8Array(MAX_SHARE_BYTES + 1)]),
        name: "huge.jpg",
        type: "image/jpeg",
      })
    ).toBeNull();
    expect(acceptPickedPhoto(null, 10)).toBeNull();
    const tiny = new File(["x"], "x.jpg", { type: "image/jpeg" });
    expect(acceptPickedPhoto(tiny, tiny.size)).toBe(tiny);
    expect(acceptPickedPhoto(tiny, tiny.size - 1)).toBeNull();
  });

  it("reads a share once when the page effect runs twice", async () => {
    let reads = 0;
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const deps = {
      readStored: async () => {
        reads += 1;
        await gate;
        return stored("once", "once.jpg", "image/jpeg");
      },
      fetchServerShare: async () => null,
    };
    const first = consumeSharedPhoto("?shared=1", deps);
    const second = consumeSharedPhoto("?shared=1", deps);
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(reads).toBe(1);
    expect(a).toBe(b);
    expect(await a?.text()).toBe("once");
  });
});
