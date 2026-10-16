/**
 * Client-side readiness for the first painted frame.
 *
 * There are three different facts here, and they must not be collapsed into
 * one `load` event:
 *
 * - the browser selected a URL and finished its request;
 * - the selected response decoded successfully; and
 * - the particular image element that will paint it has decoded.
 *
 * The ignition gates on the last of those for its two hero layers and on the
 * small set of font faces used by the opening viewport. Everything else is a
 * best-effort, low-priority warm-up. A warm-up is deliberately not part of
 * the ignition's success result.
 */

export type AssetResult = {
  status: "ready" | "failed";
  source?: string;
  reason?: "request" | "decode" | "source-changed" | "missing" | "timeout" | "cancelled";
};

/** Schedule a later task and return its cleanup; injectable for Node tests. */
type Schedule = (callback: () => void, delayMs: number) => () => void;

export type ReadinessOptions = {
  signal?: AbortSignal;
  /** One deadline for the entire request/decode operation, including retries. */
  timeoutMs?: number;
  schedule?: Schedule;
};

const scheduleTask: Schedule = (callback, delayMs) => {
  const timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
};
const DEFAULT_TIMEOUT_MS = 4000;

export type WarmupStatus = "warming" | "ready" | "degraded" | "cancelled";

export type WarmupResult = {
  status: Exclude<WarmupStatus, "warming">;
  total: number;
  ready: number;
  failed: number;
};

type ElementDecode = {
  promise: Promise<AssetResult>;
  observe: (signal?: AbortSignal) => void;
};

const elementDecodes = new WeakMap<HTMLImageElement, ElementDecode>();

/** Read-only snapshot, not a prediction of a lazy picture's future candidate. */
export function selectedImageSource(image: HTMLImageElement): string {
  return image.currentSrc || image.src;
}

function failed(reason: NonNullable<AssetResult["reason"]>, source?: string): AssetResult {
  return { status: "failed", reason, ...(source ? { source } : {}) };
}

/**
 * Decode the actual element, never a URL probe. Only concurrent work is cached:
 * later calls must revalidate even an unchanged URL. Shared references use the
 * first call's deadline; aborting any reference cancels that shared operation.
 * Cleanup stops observation, not the browser's underlying request or decode.
 */
export function decodeImage(
  image: HTMLImageElement,
  options: ReadinessOptions = {},
): Promise<AssetResult> {
  const cached = elementDecodes.get(image);
  if (cached) {
    cached.observe(options.signal);
    return cached.promise;
  }

  let resolveResult!: (result: AssetResult) => void;
  const promise = new Promise<AssetResult>((resolve) => { resolveResult = resolve; });
  let settled = false;
  let decoding = false;
  let changes = 0;
  let clearTimer = () => {};
  const signals = new Set<AbortSignal>();
  const finish = (result: AssetResult) => {
    if (settled) return;
    settled = true;
    clearTimer();
    image.removeEventListener("load", inspect);
    image.removeEventListener("error", onError);
    for (const signal of signals) signal.removeEventListener("abort", onAbort);
    signals.clear();
    elementDecodes.delete(image);
    resolveResult(result);
  };
  const onAbort = () => finish(failed("cancelled", selectedImageSource(image)));
  const onError = () => finish(failed("request", selectedImageSource(image)));
  const hasPixels = () => image.naturalWidth > 0 && image.naturalHeight > 0;
  const afterDecode = (source: string, success: boolean) => {
    if (settled) return;
    decoding = false;
    // Recheck immediately on both resolve and reject: decode can reject when
    // a responsive candidate changes, rather than because its pixels are bad.
    if (selectedImageSource(image) !== source) {
      changes += 1;
      if (changes >= 3) finish(failed("source-changed", selectedImageSource(image)));
      else inspect();
    } else if (!success || !image.complete || !hasPixels()) {
      finish(failed("decode", source));
    } else {
      finish({ status: "ready", source });
    }
  };
  function inspect() {
    if (settled || decoding) return;
    const source = selectedImageSource(image);
    if (!source) return finish(failed("missing"));
    if (!image.complete) return;
    if (!hasPixels()) return finish(failed("request", source));
    decoding = true;
    try {
      image.decode().then(
        () => afterDecode(source, true),
        () => afterDecode(source, false),
      );
    } catch {
      afterDecode(source, false);
    }
  }
  const observe = (signal?: AbortSignal) => {
    if (!signal || settled || signals.has(signal)) return;
    signals.add(signal);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  };
  elementDecodes.set(image, { promise, observe });
  image.addEventListener("load", inspect);
  image.addEventListener("error", onError);
  clearTimer = (options.schedule ?? scheduleTask)(
    () => finish(failed("timeout", selectedImageSource(image))),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  observe(options.signal);
  inspect();
  return promise;
}

/** Decode every required rendered element, including duplicate URLs. */
export async function decodeImages(
  images: HTMLImageElement[],
  options: ReadinessOptions = {},
): Promise<AssetResult> {
  if (images.length === 0) return failed("missing");
  const results = await Promise.all([...new Set(images)].map((image) => decodeImage(image, options)));
  return results.find((result) => result.status === "failed") ?? results[0];
}

/**
 * Sample text in the opening viewport, at its own computed family/weight.
 * Own text nodes keep a mono child from being sampled as its label parent.
 * Opacity is intentionally ignored: the ignition holds opening copy at zero.
 * Chivo Sans participates only if prose is actually in this viewport (case
 * files can have it). Neither document.fonts.ready nor other network is a gate.
 */
export function waitForOpeningFonts(
  document: Document,
  options: ReadinessOptions = {},
): Promise<AssetResult> {
  const fontSet = document.fonts;
  const view = document.defaultView;
  if (options.signal?.aborted) return Promise.resolve(failed("cancelled", "fonts"));
  if (!fontSet || typeof fontSet.load !== "function" || !view) {
    return Promise.resolve(failed("missing", "fonts"));
  }

  const specs = new Map<string, string>();
  for (const element of document.querySelectorAll<HTMLElement>("body, body *")) {
    if (element.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;
    if (element.closest("script, style, noscript, template, [hidden], .sr-only, [role='tooltip']")) continue;
    let sample = [
      ...Array.from(element.childNodes)
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent ?? ""),
      element.getAttribute("data-name") ?? "",
      element.getAttribute("data-credit") ?? "",
    ].join(" ").trim();
    if (!sample) continue;
    const rect = element.getBoundingClientRect();
    if (
      rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.right <= 0 ||
      rect.top >= view.innerHeight || rect.left >= view.innerWidth
    ) continue;
    const style = view.getComputedStyle(element);
    const family = style.fontFamily.split(",")[0]?.trim();
    if (!family || style.display === "none" || style.visibility !== "visible") continue;
    if (style.textTransform === "uppercase") sample = sample.toUpperCase();
    if (style.textTransform === "lowercase") sample = sample.toLowerCase();
    // Size doesn't select another face; merge samples for each family/weight.
    const spec = `${style.fontStyle} ${style.fontWeight} 16px ${family}`;
    specs.set(spec, [specs.get(spec), sample].filter(Boolean).join(" "));
  }
  if (specs.size === 0) return Promise.resolve(failed("missing", "fonts"));

  const work = Promise.all(
    [...specs].map(async ([spec, sample]) => {
      try {
        const faces = await fontSet.load(spec, sample);
        return faces.length > 0 &&
          (typeof fontSet.check !== "function" || fontSet.check(spec, sample));
      } catch {
        return false;
      }
    }),
  );
  return new Promise<AssetResult>((resolve) => {
    let settled = false;
    const finish = (result: AssetResult) => {
      if (settled) return;
      settled = true;
      clearTimer();
      options.signal?.removeEventListener("abort", onAbort);
      resolve(result);
    };
    const onAbort = () => finish(failed("cancelled", "fonts"));
    const clearTimer = (options.schedule ?? scheduleTask)(
      () => finish(failed("timeout", "fonts")),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) onAbort();
    void work.then((results) => finish(
      results.every(Boolean) ? { status: "ready", source: "fonts" } : failed("request", "fonts"),
    ));
  });
}

/**
 * Warm one rendered plate group (dark + lit) at a time. Only the active group
 * becomes eager, so its original pictures choose format/crop/width and the
 * browser can coalesce their requests. Counts are plates, not layers or URLs.
 * A timeout degrades this group and advances the queue. Cancellation removes
 * scheduled work/listeners; already-started browser requests cannot be undone.
 */
export function startPlateWarmup(
  images: HTMLImageElement[],
  onStatus?: (status: WarmupStatus) => void,
  options: ReadinessOptions & { delayMs?: number } = {},
): { promise: Promise<WarmupResult>; cancel: () => void } {
  const groups: HTMLImageElement[][] = [];
  const seen = new Set<HTMLImageElement>();
  for (const image of images) {
    if (seen.has(image)) continue;
    const plate = image.closest("[data-plate]");
    const layers = [...new Set(plate
      ? plate.querySelectorAll<HTMLImageElement>("img.plate-dark, img.plate-lit")
      : [image])].filter((layer) => !seen.has(layer));
    for (const layer of layers) seen.add(layer);
    if (layers.length > 0) groups.push(layers);
  }
  const controller = new AbortController();
  const schedule = options.schedule ?? scheduleTask;
  let clearTask = () => {};
  let settled = false;
  let ready = 0;
  let failedCount = 0;
  let next = 0;
  let resolveResult!: (result: WarmupResult) => void;
  const promise = new Promise<WarmupResult>((resolve) => {
    resolveResult = resolve;
  });

  const finish = (status: WarmupResult["status"]) => {
    if (settled) return;
    settled = true;
    clearTask();
    options.signal?.removeEventListener("abort", cancel);
    resolveResult({ status, total: groups.length, ready, failed: failedCount });
    onStatus?.(status);
  };
  const cancel = () => {
    if (settled) return;
    controller.abort();
    finish("cancelled");
  };

  const run = async () => {
    if (settled) return;
    const group = groups[next++];
    if (!group) return finish(failedCount === 0 ? "ready" : "degraded");
    // Set priority before activation. Never touch src/srcset/sizes or sources.
    for (const image of group) image.fetchPriority = "low";
    for (const image of group) image.loading = "eager";
    const result = await decodeImages(group, { ...options, signal: controller.signal });
    if (settled) return;
    if (result.status === "ready") ready += 1;
    else failedCount += 1;
    if (next < groups.length) {
      clearTask = schedule(() => void run(), 0);
    } else {
      finish(failedCount === 0 ? "ready" : "degraded");
    }
  };

  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  else {
    onStatus?.("warming");
    // Yield once to the high-priority opening work, and between groups.
    if (!settled) clearTask = schedule(() => void run(), options.delayMs ?? 0);
  }
  return { promise, cancel };
}
