const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/gouramis.js"), "utf8");

// A deterministic animation clock exercises the actual controller without browser dependencies.
function aquarium({ width = 1920, height = 900, reduced = false, seed = 7 } = {}) {
  let now = 0;
  let nextId = 0;
  const frames = new Map();
  const timers = new Map();
  const events = new Map();
  const windowEvents = new Map();
  const children = [];
  function classes(initial = "") {
    const names = new Set(initial.split(" ").filter(Boolean));
    return {
      add: (...items) => items.forEach((item) => names.add(item)),
      remove: (...items) => items.forEach((item) => names.delete(item)),
      contains: (item) => names.has(item),
      toggle(item, force = !names.has(item)) { force ? names.add(item) : names.delete(item); return force; },
    };
  }
  const win = {
    innerWidth: width, innerHeight: height, scrollY: 0,
    addEventListener: (name, fn) => windowEvents.set(name, fn),
  };
  const preference = { matches: reduced, addEventListener: (_, fn) => { preference.onChange = fn; } };
  win.matchMedia = () => preference;
  const fish = [false, true].map((male) => {
    const paths = [male ? "M147 76 C146 94 140 109 127 122" : "M147 79 C146 95 140 109 127 122",
      male ? "M150 76 C151 95 151 111 149 126" : "M150 79 C151 97 151 111 149 126"].map((d) => ({
      d, original: d, getAttribute() { return this.d; }, setAttribute(_, value) { this.d = value; },
    }));
    return {
      style: {}, classList: classes(male ? "gourami gourami--male" : "gourami"), paths,
      get offsetWidth() { return win.innerWidth <= 760 ? male ? 76 : 80 : male ? 114 : 120; },
      get offsetHeight() { return win.innerWidth <= 760 ? male ? 53.76 : 51 : male ? 79.36 : 77; },
      querySelectorAll: () => paths,
      addEventListener(name, fn) { this[name] = fn; },
      getBoundingClientRect() {
        const values = this.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
        const left = Number(values[1]);
        const top = Number(values[2]) - (this.classList.contains("is-hero") ? win.scrollY : 0);
        return { left, top, right: left + this.offsetWidth, bottom: top + this.offsetHeight };
      },
    };
  });
  const attributes = {};
  const root = { classList: classes(), getAttribute: (name) => attributes[name] };
  const observers = [];
  const hint = { classList: classes() };
  const rect = () => ({ left: (win.innerWidth - Math.min(1000, win.innerWidth - 32)) / 2,
    right: (win.innerWidth + Math.min(1000, win.innerWidth - 32)) / 2,
    width: Math.min(1000, win.innerWidth - 32), top: 100 - win.scrollY, bottom: 600 - win.scrollY });
  const perch = { getBoundingClientRect: () => ({ right: rect().left + Math.min(325, rect().width - 32),
    top: 455 - win.scrollY, height: 40 }) };
  const hero = { getBoundingClientRect: rect, querySelector: () => perch };
  const document = {
    documentElement: root,
    querySelectorAll: () => fish,
    querySelector: (selector) => selector === ".hero" ? hero : hint,
    addEventListener: (name, fn) => events.set(name, fn),
    body: { appendChild: (el) => children.push(el) },
    createElement: () => {
      const el = { style: {}, classList: classes(), addEventListener() {},
        remove() { const index = children.indexOf(el); if (index >= 0) children.splice(index, 1); } };
      return el;
    },
  };
  const random = Object.create(Math);
  random.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  vm.runInNewContext(source, {
    document, window: win, Math: random, performance: { now: () => now },
    requestAnimationFrame(fn) { frames.set(++nextId, fn); return nextId; },
    cancelAnimationFrame: (id) => frames.delete(id),
    setTimeout(fn, duration) { timers.set(++nextId, { fn, due: now + duration }); return nextId; },
    MutationObserver: class { constructor(fn) { observers.push(fn); } observe() {} },
  });
  const step = (ms = 1000 / 60) => {
    now += ms;
    for (const [id, timer] of timers) if (timer.due <= now) { timers.delete(id); timer.fn(); }
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((fn) => fn(now));
  };
  const until = (predicate, duration = 180000) => {
    const deadline = now + duration;
    while (now < deadline && !predicate()) step();
    assert.ok(predicate(), `Condition was not reached by ${Math.round(now)}ms`);
  };
  const click = (x, y, interactive = false) => events.get("click")({ clientX: x, clientY: y,
    target: { closest: () => interactive ? {} : null } });
  return { fish, root, hint, children, win, step, until, click,
    get frames() { return frames.size; },
    resize(width, height = win.innerHeight) { win.innerWidth = width; win.innerHeight = height; windowEvents.get("resize")(); },
    reduce(value) { preference.matches = value; preference.onChange({ matches: value }); },
    theme(value) { attributes["data-theme"] = value; observers.forEach((fn) => fn([])); },
    tick(duration) { const end = now + duration; while (now < end) step(); },
  };
}

function tip(fish, i = 0) {
  const numbers = fish.paths[i].d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const r = fish.getBoundingClientRect();
  const localX = numbers.at(-2) * fish.offsetWidth / 200;
  return { x: r.left + (fish.classList.contains("is-left") ? fish.offsetWidth - localX : localX),
    y: r.top + numbers.at(-1) * fish.offsetHeight / 128 };
}

function touching(tank) {
  if (!tank.fish.every((f) => f.classList.contains("is-social"))) return false;
  return [0, 1].every((i) => {
    const a = tip(tank.fish[0], i), b = tip(tank.fish[1], i);
    return Math.hypot(a.x - b.x, a.y - b.y) < 0.1;
  });
}

test("both fish meet, touch matching feeler tips, then return to swimming", () => {
  const tank = aquarium();
  tank.until(() => touching(tank));
  const a = tank.fish[0].getBoundingClientRect(), b = tank.fish[1].getBoundingClientRect();
  assert.ok(a.right < b.left, "bodies remain apart during the wide-margin greeting");
  assert.equal(tank.fish[0].classList.contains("is-left"), false);
  assert.equal(tank.fish[1].classList.contains("is-left"), true);
  tank.until(() => tank.fish.every((f) => !f.classList.contains("is-social")), 6000);
  for (const f of tank.fish) for (const p of f.paths) assert.equal(p.d, p.original);
  const before = tank.fish.map((f) => f.style.transform);
  tank.tick(5000);
  tank.fish.forEach((f, i) => assert.notEqual(f.style.transform, before[i]));
});

test("both fish fit, stay separate, and touch feelers on a phone", () => {
  const tank = aquarium({ width: 375, height: 812 });
  for (const f of tank.fish) {
    const r = f.getBoundingClientRect();
    assert.ok(f.classList.contains("is-hero"));
    assert.ok(r.left >= 16 && r.right <= 359);
  }
  tank.until(() => touching(tank), 45000);
  tank.resize(320);
  assert.ok(tank.fish.every((f) => !f.classList.contains("is-social")));
  tank.until(() => touching(tank), 65000);
});

test("narrow desktop margins use a staggered greeting without overlapping bodies", () => {
  const tank = aquarium({ width: 1280 });
  tank.until(() => touching(tank));
  const [a, b] = tank.fish.map((f) => f.getBoundingClientRect());
  // Main body bounds in each SVG, excluding the trailing feelers.
  assert.ok(a.top + 88 / 128 * tank.fish[0].offsetHeight < b.top + 23 / 128 * tank.fish[1].offsetHeight);
  for (const r of [a, b]) assert.ok(r.right <= 156 || r.left >= 1124);
});

test("food interrupts a meeting, is shared, and is eaten only once", () => {
  const tank = aquarium();
  tank.until(() => touching(tank));
  const r = tank.fish[0].getBoundingClientRect();
  tank.click(r.left - 24, r.top + 30);
  assert.equal(tank.children.filter((el) => el.className === "gourami-pellet").length, 1);
  assert.ok(tank.fish.every((f) => !f.classList.contains("is-social")));
  tank.until(() => tank.children.some((el) => el.textContent === "yum!"), 12000);
  assert.equal(tank.children.filter((el) => el.textContent === "yum!").length, 1);
  assert.equal(tank.children.filter((el) => el.className === "gourami-pellet").length, 0);
  assert.equal(tank.hint.classList.contains("is-shown"), false);
});

test("both fish still greet clicks, and links do not drop food", () => {
  const tank = aquarium({ width: 375 });
  tank.fish.forEach((f) => {
    const r = f.getBoundingClientRect();
    tank.click((r.left + r.right) / 2, r.top + 20);
    assert.ok(f.classList.contains("is-spinning"));
  });
  assert.equal(tank.children.filter((el) => el.textContent === "hi!").length, 2);
  tank.resize(1920);
  tank.click(20, 200, true);
  assert.equal(tank.children.filter((el) => el.className === "gourami-pellet").length, 0);
});

test("reduced motion parks two separate fish and cleans up greeting bubbles", () => {
  const tank = aquarium({ reduced: true });
  assert.equal(tank.frames, 0);
  const before = tank.fish.map((f) => f.style.transform);
  assert.notEqual(before[0], before[1]);
  tank.tick(50000);
  tank.fish.forEach((f, i) => assert.equal(f.style.transform, before[i]));
  const r = tank.fish[0].getBoundingClientRect();
  tank.click(r.left + 60, r.top + 20);
  assert.equal(tank.children.filter((el) => el.textContent === "hi!").length, 1);
  tank.tick(3000);
  assert.equal(tank.children.length, 0);
  tank.reduce(false);
  assert.equal(tank.frames, 1);
  tank.until(() => touching(tank));
  tank.reduce(true);
  assert.equal(tank.frames, 0);
  assert.ok(tank.fish.every((f) => !f.classList.contains("is-social")));
  tank.fish.forEach((f) => f.paths.forEach((p) => assert.equal(p.d, p.original)));
});

test("scrolling, resizing during an encounter, and repeated mode changes recover cleanly", () => {
  const tank = aquarium({ width: 375 });
  tank.until(() => touching(tank));
  tank.win.scrollY = 600;
  tank.tick(100);
  assert.ok(tank.fish.every((f) => !f.classList.contains("is-social")));
  tank.resize(1440);
  tank.tick(15000);
  tank.resize(375);
  assert.ok(tank.fish.every((f) => f.classList.contains("is-hero")));
  tank.win.scrollY = 0;
  tank.resize(1920);
  tank.until(() => touching(tank));
  tank.resize(320);
  for (const f of tank.fish) {
    const r = f.getBoundingClientRect();
    assert.ok(Number.isFinite(r.left) && r.left >= 16 && r.right <= 304);
    assert.equal(f.classList.contains("is-social"), false);
  }
  assert.equal(tank.frames, 1, "mode changes do not start duplicate animation loops");
});

test("address-bar resizes on a phone keep a greeting going and do not restart the fish", () => {
  const tank = aquarium({ width: 375, height: 812 });
  tank.until(() => touching(tank), 45000);
  const before = tank.fish.map((f) => f.style.transform);
  tank.resize(375, 750);
  tank.resize(375, 812);
  assert.ok(tank.fish.every((f) => f.classList.contains("is-social")));
  tank.fish.forEach((f, i) => assert.equal(f.style.transform, before[i]));
  tank.until(() => tank.fish.every((f) => !f.classList.contains("is-social")), 6000);
});

test("without side margins the fish roam the hero all the way to the edges of the box", () => {
  for (const width of [375, 1000]) {
    const tank = aquarium({ width });
    const hero = { left: (width - Math.min(1000, width - 32)) / 2, right: (width + Math.min(1000, width - 32)) / 2 };
    let left = Infinity, right = -Infinity;
    for (let t = 0; t < 240000; t += 250) {
      tank.tick(250);
      for (const f of tank.fish) {
        const r = f.getBoundingClientRect();
        assert.ok(r.left >= hero.left + 12 - 0.5 && r.right <= hero.right - 12 + 0.5, `fish stays inside the hero at ${width}px`);
        left = Math.min(left, r.left);
        right = Math.max(right, r.right);
      }
    }
    assert.ok(right > hero.right - 40, `reaches the right edge at ${width}px`);
    if (width === 375) assert.ok(left < hero.left + 40, "reaches the left edge on a phone");
  }
});

test("both fish say spooky! when the site switches to dark mode, and nothing when it switches back", () => {
  const tank = aquarium({ width: 375 });
  const spooky = () => tank.children.filter((el) => el.textContent === "spooky!").length;
  tank.theme("dark");
  tank.tick(400);
  assert.equal(spooky(), 2);
  tank.tick(3000);
  tank.theme("light");
  tank.tick(1000);
  assert.equal(spooky(), 0);
});
