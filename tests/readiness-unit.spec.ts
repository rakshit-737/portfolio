import { expect, test } from "@playwright/test";
import {
  decodeImage,
  decodeImages,
  selectedImageSource,
  startPlateWarmup,
  waitForOpeningFonts,
  type ReadinessOptions,
  type WarmupStatus,
} from "../src/lib/asset-readiness";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

type Decode = ReturnType<typeof deferred<void>>;

/** No clock or browser: tests explicitly release scheduled tasks and decodes. */
function manualScheduler() {
  const tasks = new Map<number, { callback: () => void; delay: number }>();
  const waiters: { delay: number; done: ReturnType<typeof deferred<void>> }[] = [];
  let id = 0;
  const schedule: NonNullable<ReadinessOptions["schedule"]> = (callback, delay) => {
    const key = id++;
    tasks.set(key, { callback, delay });
    for (const waiter of [...waiters]) {
      if (waiter.delay !== delay) continue;
      waiters.splice(waiters.indexOf(waiter), 1);
      waiter.done.resolve();
    }
    return () => { tasks.delete(key); };
  };
  return {
    schedule,
    get size() { return tasks.size; },
    run(delay: number) {
      const entry = [...tasks].find(([, task]) => task.delay === delay);
      if (!entry) throw new Error(`No scheduled task at ${delay}ms`);
      tasks.delete(entry[0]);
      entry[1].callback();
    },
    whenScheduled(delay: number) {
      if ([...tasks.values()].some((task) => task.delay === delay)) return Promise.resolve();
      const done = deferred<void>();
      waiters.push({ delay, done });
      return done.promise;
    },
  };
}

class ControlledImage {
  complete = false;
  naturalWidth = 0;
  naturalHeight = 0;
  fetchPriority = "auto";
  private loadingValue = "lazy";
  readonly activations: string[] = [];
  readonly decodes: Decode[] = [];
  readonly listeners = new Map<string, Set<() => void>>();
  private decodeWaiters = new Map<number, ReturnType<typeof deferred<Decode>>>();
  plate: Element | null = null;
  onEager?: () => void;

  constructor(public currentSrc: string, public readonly src = currentSrc) {}
  get image() { return this as unknown as HTMLImageElement; }
  get loading() { return this.loadingValue; }
  set loading(value: string) {
    this.loadingValue = value;
    if (value === "eager") {
      this.activations.push(this.fetchPriority);
      this.onEager?.();
    }
  }
  get listenerCount() {
    return [...this.listeners.values()].reduce((total, listeners) => total + listeners.size, 0);
  }
  closest(selector: string) {
    if (selector !== "[data-plate]") throw new Error("Unexpected DOM probe");
    return this.plate;
  }
  addEventListener(type: string, listener: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }
  emit(type: string) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener();
  }
  load(width = 640, height = 960) {
    this.complete = true;
    this.naturalWidth = width;
    this.naturalHeight = height;
    this.emit("load");
  }
  decode() {
    const decode = deferred<void>();
    const index = this.decodes.push(decode) - 1;
    this.decodeWaiters.get(index)?.resolve(decode);
    this.decodeWaiters.delete(index);
    return decode.promise;
  }
  decodeAt(index: number) {
    if (this.decodes[index]) return Promise.resolve(this.decodes[index]);
    const waiter = deferred<Decode>();
    this.decodeWaiters.set(index, waiter);
    return waiter.promise;
  }
}

function plate(name: string) {
  const dark = new ControlledImage("", `/art/${name}-2560.webp`);
  const lit = new ControlledImage("", `/art/${name}-2560.webp`);
  const layers = [dark, lit];
  const element = {
    querySelectorAll(selector: string) {
      expect(selector).toBe("img.plate-dark, img.plate-lit");
      return layers.map((layer) => layer.image);
    },
  } as unknown as Element;
  for (const layer of layers) {
    layer.plate = element;
    // The fake browser evaluates the *original* picture only on activation.
    layer.onEager = () => { layer.currentSrc = `/art/${name}-narrow-640.avif`; };
  }
  return { dark, lit, layers };
}

test("selectedImageSource only reads currentSrc or src, even for a lazy picture", () => {
  const image = Object.freeze({
    currentSrc: "/art/blacksmith-narrow-640.avif",
    src: "/art/blacksmith-2560.webp",
    closest() { throw new Error("Source inspection must not probe the DOM"); },
  }) as unknown as HTMLImageElement;
  expect(selectedImageSource(image)).toBe(image.currentSrc);
  expect(selectedImageSource({ ...image, currentSrc: "" } as HTMLImageElement)).toBe(image.src);
});

test("concurrent references share one element decode, including during a candidate change", async () => {
  const clock = manualScheduler();
  const fake = new ControlledImage("/old.avif");
  const first = decodeImage(fake.image, { schedule: clock.schedule });
  expect(decodeImage(fake.image)).toBe(first);
  fake.currentSrc = "/current.avif";
  expect(decodeImage(fake.image)).toBe(first);
  fake.load();
  fake.decodes[0].resolve();
  await expect(first).resolves.toEqual({ status: "ready", source: "/current.avif" });
  expect(fake.decodes).toHaveLength(1);
  expect(fake.listenerCount).toBe(0);
  expect(clock.size).toBe(0);

  // A settled task is not a permanent certificate, even for the same URL.
  const again = decodeImage(fake.image, { schedule: clock.schedule });
  expect(again).not.toBe(first);
  fake.decodes[1].resolve();
  await expect(again).resolves.toMatchObject({ status: "ready" });
});

test("duplicate references are deduplicated but distinct elements with one URL both decode", async () => {
  const clock = manualScheduler();
  const dark = new ControlledImage("/shared.avif");
  const lit = new ControlledImage("/shared.avif");
  const result = decodeImages([dark.image, dark.image, lit.image], { schedule: clock.schedule });
  dark.load();
  lit.load();
  dark.decodes[0].resolve();
  lit.decodes[0].resolve();
  await expect(result).resolves.toEqual({ status: "ready", source: "/shared.avif" });
  expect(dark.decodes).toHaveLength(1);
  expect(lit.decodes).toHaveLength(1);
  expect(clock.size).toBe(0);
});

for (const failure of ["error", "width", "height"] as const) {
  test(`a failed request (${failure}) is not decoded or reported ready`, async () => {
    const clock = manualScheduler();
    const fake = new ControlledImage("/broken.avif");
    const result = decodeImage(fake.image, { schedule: clock.schedule });
    if (failure === "error") fake.emit("error");
    else fake.load(failure === "width" ? 0 : 640, failure === "height" ? 0 : 960);
    await expect(result).resolves.toEqual({ status: "failed", reason: "request", source: fake.src });
    expect(fake.decodes).toHaveLength(0);
    expect(fake.listenerCount).toBe(0);
    expect(clock.size).toBe(0);
  });
}

test("a cached complete image still requires its actual decode to succeed", async () => {
  const clock = manualScheduler();
  const fake = new ControlledImage("/undecodable.avif");
  fake.load();
  const result = decodeImage(fake.image, { schedule: clock.schedule });
  fake.decodes[0].reject(new Error("bad pixels"));
  await expect(result).resolves.toEqual({ status: "failed", reason: "decode", source: fake.src });
  expect(fake.listenerCount).toBe(0);
  expect(clock.size).toBe(0);
});

for (const outcome of ["resolve", "reject"] as const) {
  test(`a source change during decode (${outcome}) waits for and decodes the new candidate`, async () => {
    const clock = manualScheduler();
    const fake = new ControlledImage("/old.avif");
    const result = decodeImage(fake.image, { schedule: clock.schedule });
    fake.load();
    fake.currentSrc = "/new.avif";
    fake.complete = false;
    if (outcome === "resolve") fake.decodes[0].resolve();
    else fake.decodes[0].reject(new Error("candidate replaced"));
    // A queued load is an explicit event, not a time-based delay.
    queueMicrotask(() => fake.load());
    const next = await fake.decodeAt(1);
    next.resolve();
    await expect(result).resolves.toEqual({ status: "ready", source: "/new.avif" });
    expect(fake.decodes).toHaveLength(2);
    expect(clock.size).toBe(0);
  });
}

test("repeated candidate changes fail instead of certifying the last stale decode", async () => {
  const clock = manualScheduler();
  const fake = new ControlledImage("/0.avif");
  fake.load();
  const result = decodeImage(fake.image, { schedule: clock.schedule });
  for (let index = 0; index < 3; index += 1) {
    const decode = await fake.decodeAt(index);
    fake.currentSrc = `/${index + 1}.avif`;
    decode.resolve();
  }
  await expect(result).resolves.toEqual({
    status: "failed", reason: "source-changed", source: "/3.avif",
  });
  expect(fake.decodes).toHaveLength(3);
  expect(fake.listenerCount).toBe(0);
  expect(clock.size).toBe(0);
});

for (const stage of ["request", "decode"] as const) {
  test(`a stuck ${stage} times out and releases listeners and the in-flight cache`, async () => {
    const clock = manualScheduler();
    const fake = new ControlledImage("/stuck.avif");
    const options = { schedule: clock.schedule, timeoutMs: 40 };
    const result = decodeImage(fake.image, options);
    if (stage === "decode") fake.load();
    clock.run(40);
    await expect(result).resolves.toEqual({ status: "failed", reason: "timeout", source: fake.src });
    expect(fake.listenerCount).toBe(0);
    expect(clock.size).toBe(0);
    // A late rejection is handled, and cannot overwrite the timeout.
    if (stage === "decode") fake.decodes[0].reject(new Error("late decode"));
    const retry = decodeImage(fake.image, options);
    fake.load();
    fake.decodes.at(-1)!.resolve();
    await expect(retry).resolves.toMatchObject({ status: "ready" });
    expect(clock.size).toBe(0);
  });

  test(`cancelling a shared ${stage} cleans up even when another reference supplied the signal`, async () => {
    const clock = manualScheduler();
    const fake = new ControlledImage("/cancel.avif");
    const controller = new AbortController();
    const first = decodeImage(fake.image, { schedule: clock.schedule });
    const second = decodeImage(fake.image, { signal: controller.signal });
    expect(second).toBe(first);
    if (stage === "decode") fake.load();
    controller.abort();
    await expect(first).resolves.toEqual({ status: "failed", reason: "cancelled", source: fake.src });
    expect(fake.listenerCount).toBe(0);
    expect(clock.size).toBe(0);
    if (stage === "decode") fake.decodes[0].resolve();
  });
}

test("an already-aborted signal never starts decoding", async () => {
  const clock = manualScheduler();
  const fake = new ControlledImage("/cancel.avif");
  fake.load();
  const controller = new AbortController();
  controller.abort();
  await expect(decodeImage(fake.image, { signal: controller.signal, schedule: clock.schedule })).resolves.toEqual({
    status: "failed", reason: "cancelled", source: fake.src,
  });
  expect(fake.decodes).toHaveLength(0);
  expect(fake.listenerCount).toBe(0);
  expect(clock.size).toBe(0);
});

test("pixels must still be present immediately after decode", async () => {
  const clock = manualScheduler();
  const fake = new ControlledImage("/lost-pixels.avif");
  const result = decodeImage(fake.image, { schedule: clock.schedule });
  fake.load();
  fake.naturalHeight = 0;
  fake.decodes[0].resolve();
  await expect(result).resolves.toEqual({
    status: "failed", reason: "decode", source: fake.src,
  });
});

test("empty image inputs explicitly fail", async () => {
  await expect(decodeImages([])).resolves.toEqual({ status: "failed", reason: "missing" });
  const clock = manualScheduler();
  await expect(decodeImage(new ControlledImage("").image, { schedule: clock.schedule })).resolves.toEqual({
    status: "failed", reason: "missing",
  });
  expect(clock.size).toBe(0);
});

test("warmup activates and decodes both original layers of only one plate at a time", async () => {
  const clock = manualScheduler();
  const first = plate("first");
  const second = plate("second");
  const statuses: WarmupStatus[] = [];
  const warmup = startPlateWarmup(
    [first.lit.image, first.lit.image, first.dark.image, second.lit.image],
    (status) => { statuses.push(status); },
    { schedule: clock.schedule },
  );
  expect(first.layers.map((layer) => layer.loading)).toEqual(["lazy", "lazy"]);
  clock.run(0);
  for (const layer of first.layers) {
    expect(layer.loading).toBe("eager");
    expect(layer.activations).toEqual(["low"]);
    expect(layer.src).toBe("/art/first-2560.webp");
    expect(layer.currentSrc).toBe("/art/first-narrow-640.avif");
    layer.load();
  }
  const darkReady = decodeImage(first.dark.image);
  first.dark.decodes[0].resolve();
  await darkReady;
  expect(second.layers.map((layer) => layer.loading)).toEqual(["lazy", "lazy"]);
  expect(clock.size).toBe(1); // Only the lit layer's deadline remains.
  first.lit.decodes[0].resolve();
  await clock.whenScheduled(0);
  clock.run(0);
  for (const layer of second.layers) {
    expect(layer.activations).toEqual(["low"]);
    layer.load();
    layer.decodes[0].resolve();
  }
  await expect(warmup.promise).resolves.toEqual({ status: "ready", total: 2, ready: 2, failed: 0 });
  expect(statuses).toEqual(["warming", "ready"]);
  for (const layer of [...first.layers, ...second.layers]) {
    expect(layer.decodes).toHaveLength(1);
    expect(layer.listenerCount).toBe(0);
  }
  expect(clock.size).toBe(0);
  warmup.cancel();
  expect(statuses).toEqual(["warming", "ready"]);
});

test("warmup advances after a bounded timeout and reports the plate as degraded", async () => {
  const clock = manualScheduler();
  const stuck = plate("stuck");
  const next = plate("next");
  const statuses: WarmupStatus[] = [];
  const warmup = startPlateWarmup(
    [stuck.lit.image, next.lit.image],
    (status) => { statuses.push(status); },
    { schedule: clock.schedule, timeoutMs: 40 },
  );
  clock.run(0);
  // One request never loads; the other layer's actual decode never settles.
  stuck.lit.load();
  clock.run(40);
  clock.run(40);
  await clock.whenScheduled(0);
  for (const layer of stuck.layers) expect(layer.listenerCount).toBe(0);
  expect(next.lit.loading).toBe("lazy");
  clock.run(0);
  for (const layer of next.layers) {
    layer.load();
    layer.decodes[0].resolve();
  }
  await expect(warmup.promise).resolves.toEqual({ status: "degraded", total: 2, ready: 1, failed: 1 });
  expect(statuses).toEqual(["warming", "degraded"]);
  expect(clock.size).toBe(0);
  stuck.lit.decodes[0].reject(new Error("late failure"));
});

test("warmup cancellation preserves completed counts and leaves future groups lazy", async () => {
  const clock = manualScheduler();
  const first = plate("first");
  const active = plate("active");
  const future = plate("future");
  const controller = new AbortController();
  const statuses: WarmupStatus[] = [];
  const warmup = startPlateWarmup(
    [first.lit.image, active.lit.image, future.lit.image],
    (status) => { statuses.push(status); },
    { schedule: clock.schedule, signal: controller.signal },
  );
  clock.run(0);
  for (const layer of first.layers) {
    layer.load();
    layer.decodes[0].resolve();
  }
  await clock.whenScheduled(0);
  clock.run(0);
  active.lit.load();
  controller.abort();
  await expect(warmup.promise).resolves.toEqual({ status: "cancelled", total: 3, ready: 1, failed: 0 });
  expect(statuses).toEqual(["warming", "cancelled"]);
  expect(clock.size).toBe(0);
  for (const layer of active.layers) expect(layer.listenerCount).toBe(0);
  for (const layer of future.layers) {
    expect(layer.loading).toBe("lazy");
    expect(layer.fetchPriority).toBe("auto");
    expect(layer.decodes).toHaveLength(0);
  }
  active.lit.decodes[0].resolve();
  warmup.cancel();
  expect(statuses).toEqual(["warming", "cancelled"]);
});

test("warmup can be cancelled before its initial yield without activating an image", async () => {
  const clock = manualScheduler();
  const target = plate("unstarted");
  const statuses: WarmupStatus[] = [];
  const warmup = startPlateWarmup([target.lit.image], (status) => { statuses.push(status); }, {
    schedule: clock.schedule, delayMs: 10,
  });
  warmup.cancel();
  await expect(warmup.promise).resolves.toEqual({ status: "cancelled", total: 1, ready: 0, failed: 0 });
  expect(statuses).toEqual(["warming", "cancelled"]);
  expect(clock.size).toBe(0);
  expect(target.layers.map((layer) => layer.loading)).toEqual(["lazy", "lazy"]);
});

test("an abort from the warming callback does not leave a scheduled task behind", async () => {
  const clock = manualScheduler();
  const target = plate("unstarted");
  const controller = new AbortController();
  const warmup = startPlateWarmup([target.lit.image], (status) => {
    if (status === "warming") controller.abort();
  }, { schedule: clock.schedule, signal: controller.signal });
  await expect(warmup.promise).resolves.toEqual({ status: "cancelled", total: 1, ready: 0, failed: 0 });
  expect(clock.size).toBe(0);
  expect(target.lit.loading).toBe("lazy");
});

test("an empty warmup finishes ready without asserting anything about other assets", async () => {
  const clock = manualScheduler();
  const warmup = startPlateWarmup([], undefined, { schedule: clock.schedule });
  clock.run(0);
  await expect(warmup.promise).resolves.toEqual({ status: "ready", total: 0, ready: 0, failed: 0 });
  expect(clock.size).toBe(0);
});

function fontElement(
  text: string,
  family: string,
  weight = "400",
  options: { top?: number; excluded?: boolean; attrs?: Record<string, string>; display?: string } = {},
) {
  const style = {
    fontFamily: `"${family}", fallback`, fontWeight: weight, fontStyle: "normal",
    visibility: "visible", display: options.display ?? "block", textTransform: "none",
  };
  const top = options.top ?? 100;
  const element = {
    namespaceURI: "http://www.w3.org/1999/xhtml",
    childNodes: [{ nodeType: 3, textContent: text }],
    closest() { return options.excluded ? {} : null; },
    getAttribute(name: string) { return options.attrs?.[name] ?? null; },
    getBoundingClientRect() {
      return { top, bottom: top + 20, left: 0, right: 300, width: 300, height: 20 };
    },
  } as unknown as HTMLElement;
  return { element, style };
}

function fontDocument(
  entries: ReturnType<typeof fontElement>[],
  load: (spec: string, sample: string) => Promise<FontFace[]> = async () => [{} as FontFace],
) {
  const loads: { spec: string; sample: string }[] = [];
  const styles = new Map(entries.map((entry) => [entry.element, entry.style]));
  const document = {
    defaultView: {
      innerWidth: 1200, innerHeight: 800,
      getComputedStyle(element: HTMLElement) { return styles.get(element); },
    },
    querySelectorAll(selector: string) {
      expect(selector).toBe("body, body *");
      return entries.map((entry) => entry.element);
    },
    fonts: {
      get ready() { throw new Error("Unrelated fonts must never gate the opening"); },
      load(spec: string, sample: string) {
        loads.push({ spec, sample });
        return load(spec, sample);
      },
      check() { return true; },
    },
  } as unknown as Document;
  return { document, loads };
}

test("opening fonts include generated samples and actual body/nav weights, merging relevant text", async () => {
  const clock = manualScheduler();
  const label = fontElement("the record", "Manrope", "600");
  label.style.textTransform = "uppercase";
  // Parent textContent must not attribute a nested mono sample to Manrope.
  Object.defineProperty(label.element, "textContent", { value: "the record nested mono" });
  const fixture = fontDocument([
    fontElement("", "Newsreader", "400", { attrs: { "data-name": "Éva Rameshbabu" } }),
    fontElement("", "Chivo Mono", "400", { attrs: { "data-credit": "Wright · Étude" } }),
    fontElement("Opening positioning", "Chivo Mono"),
    fontElement("Rakshit Rameshbabu", "Chivo Mono", "600"),
    fontElement("ctrl K", "Chivo Mono", "600"),
    label,
    fontElement("nested mono", "Chivo Mono"),
    fontElement("Below-fold prose", "Chivo", "400", { top: 900 }),
    fontElement("Hidden mobile nav", "Other", "700", { display: "none" }),
    fontElement("Hidden tooltip", "Other", "800", { excluded: true }),
  ]);
  await expect(waitForOpeningFonts(fixture.document, { schedule: clock.schedule })).resolves.toEqual({
    status: "ready", source: "fonts",
  });
  expect(fixture.loads).toHaveLength(4);
  const samples = new Map(fixture.loads.map(({ spec, sample }) => [spec, sample]));
  expect(samples.get('normal 400 16px "Newsreader"')).toBe("Éva Rameshbabu");
  expect(samples.get('normal 400 16px "Chivo Mono"')).toBe("Wright · Étude Opening positioning nested mono");
  expect(samples.get('normal 600 16px "Chivo Mono"')).toBe("Rakshit Rameshbabu ctrl K");
  expect(samples.get('normal 600 16px "Manrope"')).toBe("THE RECORD");
  expect(clock.size).toBe(0);
});

test("Chivo Sans participates when actual opening prose is in the viewport", async () => {
  const clock = manualScheduler();
  const fixture = fontDocument([fontElement("Case-file opening prose", "Chivo", "400", { top: 600 })]);
  await expect(waitForOpeningFonts(fixture.document, { schedule: clock.schedule })).resolves.toMatchObject({ status: "ready" });
  expect(fixture.loads).toEqual([{ spec: 'normal 400 16px "Chivo"', sample: "Case-file opening prose" }]);
  expect(clock.size).toBe(0);
});

for (const failure of ["empty", "rejected"] as const) {
  test(`an unavailable opening font (${failure}) explicitly fails`, async () => {
    const clock = manualScheduler();
    const fixture = fontDocument([fontElement("Opening", "Newsreader")], async () => {
      if (failure === "rejected") throw new Error("font request failed");
      return [];
    });
    await expect(waitForOpeningFonts(fixture.document, { schedule: clock.schedule })).resolves.toEqual({
      status: "failed", reason: "request", source: "fonts",
    });
    expect(clock.size).toBe(0);
  });
}

for (const reason of ["timeout", "cancelled"] as const) {
  test(`a stuck opening font settles as ${reason} without waiting for unrelated fonts`, async () => {
    const clock = manualScheduler();
    const controller = new AbortController();
    const face = deferred<FontFace[]>();
    const fixture = fontDocument([fontElement("Opening", "Newsreader")], () => face.promise);
    const result = waitForOpeningFonts(fixture.document, {
      schedule: clock.schedule, timeoutMs: 40, signal: controller.signal,
    });
    if (reason === "timeout") clock.run(40);
    else controller.abort();
    await expect(result).resolves.toEqual({ status: "failed", reason, source: "fonts" });
    expect(clock.size).toBe(0);
    face.reject(new Error("late font failure"));
  });
}

test("pre-cancelled opening fonts make no font requests", async () => {
  const controller = new AbortController();
  controller.abort();
  const fixture = fontDocument([fontElement("Opening", "Newsreader")]);
  await expect(waitForOpeningFonts(fixture.document, { signal: controller.signal })).resolves.toEqual({
    status: "failed", reason: "cancelled", source: "fonts",
  });
  expect(fixture.loads).toEqual([]);
});
