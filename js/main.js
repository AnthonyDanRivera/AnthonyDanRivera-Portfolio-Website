// ============ THEME TOGGLE ============
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

function getSavedTheme() {
  try { return localStorage.getItem("theme"); } catch { return null; }
}

const initialTheme =
  getSavedTheme() ||
  "light";
root.setAttribute("data-theme", initialTheme);

themeToggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem("theme", next); } catch {}
});

// ============ MOBILE MENU ============
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", open);
});

navLinks.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  })
);

// ============ NAV BACKGROUND ON SCROLL ============
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ============ ACTIVE NAV LINK ============
const sections = document.querySelectorAll("main section[id]");
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.querySelectorAll("a").forEach((a) =>
        a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`)
      );
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
sections.forEach((s) => sectionObserver.observe(s));

// ============ SCROLL REVEAL ============
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el, i) => {
  // small stagger for elements in the hero
  if (el.closest(".hero")) el.style.transitionDelay = `${i * 80}ms`;
  revealObserver.observe(el);
});

// ============ TYPING EFFECT ============
// Edit these to describe yourself
const roles = ["Freelance Web Developer", "Operations Planner", "Honey Gourami Fan!"];
const typedEl = document.getElementById("typed");
let roleIndex = 0;
let charIndex = 0;
let deleting = false;

function type() {
  const current = roles[roleIndex];
  charIndex += deleting ? -1 : 1;
  typedEl.textContent = current.slice(0, charIndex);

  let delay = deleting ? 30 : 60;
  if (!deleting && charIndex === current.length) {
    delay = 2200;
    deleting = true;
  } else if (deleting && charIndex === 0) {
    deleting = false;
    roleIndex = (roleIndex + 1) % roles.length;
    delay = 500;
  }
  setTimeout(type, delay);
}
type();

// ============ PROJECT FILTERS ============
const filterButtons = document.querySelectorAll(".filter");
const cards = document.querySelectorAll(".card");

filterButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    const filter = btn.dataset.filter;
    cards.forEach((card) =>
      card.classList.toggle("is-hidden", filter !== "all" && card.dataset.category !== filter)
    );
  })
);

// ============ CONTACT FORM ============
// Submits to Netlify Forms. The hidden "bot-field" is a honeypot: people never see it,
// so if it has a value the sender is a bot and the message is dropped.
// If the submission fails (e.g. viewing the site locally), fall back to the visitor's email app.
const form = document.getElementById("contactForm");
const formNote = document.getElementById("formNote");
const YOUR_EMAIL = "anthonydanrivera@gmail.com";

const openEmailApp = (data) => {
  const subject = encodeURIComponent(`Portfolio message from ${data.get("name")}`);
  const body = encodeURIComponent(`${data.get("message")}\n\n— ${data.get("name")} (${data.get("email")})`);
  window.location.href = `mailto:${YOUR_EMAIL}?subject=${subject}&body=${body}`;
  formNote.textContent = "Opening your email app…";
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);

  if (data.get("bot-field")) {
    // Pretend it worked so the bot moves on
    formNote.textContent = "Thanks! Your message has been sent.";
    form.reset();
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  formNote.textContent = "Sending…";

  try {
    const res = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data).toString(),
    });
    if (!res.ok) throw new Error(res.status);
    formNote.textContent = "Thanks! Your message has been sent.";
    form.reset();
  } catch {
    openEmailApp(data);
  } finally {
    button.disabled = false;
  }
});

// ============ HONEY GOURAMI ============
// A small fish that drifts around behind the page. Click it in open space to say hi.
const fish = document.getElementById("gourami");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (fish) {
  const margin = 40;
  const contentWidth = 1000; // matches --maxw in style.css
  const size = () => ({ w: fish.offsetWidth, h: fish.offsetHeight });
  const rand = (min, max) => min + Math.random() * (max - min);
  const yRange = () => [90, Math.max(90, window.innerHeight - size().h - margin)];

  // The fish only swims in the empty margins beside the content column.
  // It may drift into the column's 24px side padding, but never over the text.
  const sideRange = (side) => {
    const { w } = size();
    const vw = window.innerWidth;
    const usable = (vw - contentWidth) / 2 + 16;
    return side === "left" ? [8, usable - w] : [vw - usable, vw - w - 8];
  };
  const fits = () => sideRange("left")[1] >= 8;

  // When the window is too narrow for side margins, the fish chills in the open space to the right of the
  // badge at the top of the hero, drifting a little (page coordinates, so it scrolls with the hero)
  const hero = document.querySelector(".hero");
  const badge = hero && hero.querySelector(".badge");
  const heroBox = () => {
    const { w, h } = size();
    const sy = window.scrollY;
    const b = badge.getBoundingClientRect();
    const left = b.right + 12;
    // Stay close to the badge even when the hero is wide
    const right = Math.min(hero.getBoundingClientRect().right - w - 12, left + 80);
    const mid = b.top + b.height / 2 - h / 2 + sy;
    return { x: [left, Math.max(left, right)], y: [mid - 6, mid + 6] };
  };
  const getMode = () => (fits() ? "sides" : badge ? "hero" : null);
  let mode = getMode();

  let side = Math.random() < 0.5 ? "left" : "right";
  const pickTarget = () => {
    if (mode === "hero") {
      const { x, y } = heroBox();
      return { x: rand(x[0], x[1]), y: rand(y[0], y[1]) };
    }
    const [minX, maxX] = sideRange(side);
    const [minY, maxY] = yRange();
    return { x: rand(minX, Math.max(minX, maxX)), y: rand(minY, maxY) };
  };

  let pos = pickTarget();
  let vel = { x: 0, y: 0 };
  let target = pickTarget();
  let pausedUntil = 0;
  // Crossing to the other side: swim off this edge ("exit"), then come back in from the far edge ("enter")
  let phase = null;
  let nextBubble = performance.now() + rand(4000, 8000);
  let last = performance.now();

  const place = (bob = 0, tilt = 0) => {
    fish.style.transform = `translate(${pos.x}px, ${pos.y + bob}px) rotate(${tilt}deg)`;
  };

  const spawnBubble = (text) => {
    if (pos.x < 0 || pos.x > window.innerWidth - size().w) return;
    const { w, h } = size();
    // Bubbles are fixed to the viewport; in hero mode the fish's position is in page coordinates
    const top = mode === "hero" ? pos.y - window.scrollY : pos.y;
    const facingLeft = fish.classList.contains("is-left");
    const b = document.createElement("span");
    b.className = text ? "gourami-bubble gourami-bubble--hi" : "gourami-bubble";
    if (text) b.textContent = text;
    b.style.left = `${pos.x + (facingLeft ? w * 0.02 : w * 0.92)}px`;
    b.style.top = `${top + h * 0.3 - (text ? 18 : 0)}px`;
    document.body.appendChild(b);
    b.addEventListener("animationend", () => b.remove());
  };

  const arrive = (now) => {
    const { w } = size();
    if (phase === "exit") {
      // Off screen now: pop over to the far edge and swim back in
      side = side === "left" ? "right" : "left";
      pos.x = side === "left" ? -w - 30 : window.innerWidth + 30;
      vel.x = 0;
      phase = "enter";
      target = pickTarget();
      return;
    }
    phase = null;
    // Beside the badge it lingers longer between little drifts
    pausedUntil = now + (mode === "hero" ? rand(3000, 7000) : rand(1200, 3500));
    if (mode === "sides" && Math.random() < 0.3) {
      phase = "exit";
      const [minY, maxY] = yRange();
      target = { x: side === "left" ? -w - 30 : window.innerWidth + 30, y: rand(minY, maxY) };
    } else {
      target = pickTarget();
    }
  };

  const swim = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (!mode) {
      requestAnimationFrame(swim);
      return;
    }

    if (now > pausedUntil) {
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 12) {
        arrive(now);
      } else {
        const speed = Math.min(phase ? 55 : 38, dist * 0.6);
        vel.x += ((dx / dist) * speed - vel.x) * 0.03;
        vel.y += ((dy / dist) * speed - vel.y) * 0.03;
      }
    } else {
      vel.x *= 0.96;
      vel.y *= 0.96;
    }

    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    if (Math.abs(vel.x) > 4) fish.classList.toggle("is-left", vel.x < 0);

    if (now > nextBubble) {
      spawnBubble();
      nextBubble = now + rand(5000, 10000);
    }

    const tilt = Math.max(-10, Math.min(10, vel.y * 0.3)) * (vel.x < 0 ? -1 : 1);
    place(Math.sin(now / 700) * 3, tilt);
    requestAnimationFrame(swim);
  };

  const applyMode = () => {
    mode = getMode();
    fish.classList.toggle("is-hero", mode === "hero");
    fish.style.visibility = mode ? "visible" : "hidden";
  };

  const rest = () => {
    // Reduced motion: rest quietly low in the right margin (or beside the badge in narrow windows) instead of swimming
    applyMode();
    side = "right";
    if (mode === "hero") {
      const { x, y } = heroBox();
      pos = { x: x[1], y: y[1] };
    } else {
      pos = { x: sideRange("right")[1], y: yRange()[1] };
    }
    place();
  };

  if (reduceMotion) {
    rest();
  } else {
    applyMode();
    place();
    requestAnimationFrame(swim);
  }

  window.addEventListener("resize", () => {
    if (reduceMotion) return rest();
    const prev = mode;
    applyMode();
    if (mode !== prev) {
      // Switched between the margins and the badge spot: start over in the new area
      phase = null;
      vel = { x: 0, y: 0 };
      pos = pickTarget();
      target = pickTarget();
      return place();
    }
    if (phase) return;
    if (mode === "hero") {
      const { x, y } = heroBox();
      pos.x = Math.min(Math.max(pos.x, x[0]), x[1]);
      pos.y = Math.min(Math.max(pos.y, y[0]), y[1]);
      return (target = pickTarget());
    }
    const [minX, maxX] = sideRange(side);
    const [minY, maxY] = yRange();
    pos.x = Math.min(Math.max(pos.x, minX), Math.max(minX, maxX));
    pos.y = Math.min(Math.max(pos.y, minY), maxY);
    target = pickTarget();
  });

  // The fish sits behind the content, so listen on the page and check whether the click landed on it
  document.addEventListener("click", (e) => {
    if (fish.style.visibility === "hidden") return;
    if (e.target.closest("a, button, input, textarea, label, .card")) return;
    const r = fish.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    spawnBubble("hi!");
    if (reduceMotion) return;
    fish.classList.remove("is-spinning");
    void fish.offsetWidth;
    fish.classList.add("is-spinning");
  });
  fish.addEventListener("animationend", () => fish.classList.remove("is-spinning"));
}

// ============ FOOTER YEAR ============
document.getElementById("year").textContent = new Date().getFullYear();
