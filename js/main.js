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

// ============ CONTACT FORM ============
// Submits to Netlify Forms. The hidden "bot-field" is a honeypot: people never see it,
// so if it has a value the sender is a bot and the message is dropped.
// If the submission fails (e.g. viewing the site locally), fall back to the visitor's email app.
const form = document.getElementById("contactForm");
const formNote = document.getElementById("formNote");
const YOUR_EMAIL = "anthonydanrivera@gmail.com";

const openEmailApp = (data) => {
  const subject = encodeURIComponent(`Portfolio message from ${data.get("name")}`);
  const topic = data.get("topic") ? `Topic: ${data.get("topic")}\n\n` : "";
  const body = encodeURIComponent(`${topic}${data.get("message")}\n\n—${data.get("name")} (${data.get("email")})`);
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
// On wide screens, click the empty side margins to drop food pellets; the fish swims over to eat ones that land nearby.
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
  // last social button in the hero, drifting a little (page coordinates, so it scrolls with the hero)
  const hero = document.querySelector(".hero");
  const perch = hero && hero.querySelector(".socials .social-btn:last-child");
  const heroBox = () => {
    const { w, h } = size();
    const sy = window.scrollY;
    const b = perch.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const left = b.right + 12;
    const maxRight = heroRect.right - w - 12;
    // On small phones the buttons fill the row, so there's no room beside them: drift in the open water
    // just below them instead, where the hero's glass fades out above the About box
    if (left > maxRight) {
      const y = heroRect.bottom - h / 2 - 6 + sy;
      return { x: [Math.max(heroRect.left + 8, maxRight - 60), maxRight], y: [y - 3, y + 3] };
    }
    // Stay close to the button even when the hero is wide
    const right = Math.min(maxRight, left + 80);
    const mid = b.top + b.height / 2 - h / 2 + sy;
    return { x: [left, Math.max(left, right)], y: [mid - 6, mid + 6] };
  };
  const getMode = () => (fits() ? "sides" : perch ? "hero" : null);
  // On wide screens the fish still starts out in the hero beside the buttons, like on phones, then swims off
  // to the margins after a few seconds (or as soon as the page is scrolled). Skipped if the page loads mid-scroll.
  let intro = !reduceMotion && !!perch && getMode() === "sides" && window.scrollY < 150;
  let introUntil = performance.now() + 1500;
  let mode = intro ? "hero" : getMode();

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

  // Food pellets (viewport coordinates, like the fish in the margins). They sink, settle near the bottom and fade out.
  const pellets = [];
  const maxPellets = 6;
  const reach = 420; // how far away the fish notices food
  const pelletLife = 12000;
  // Until someone feeds it, the fish now and then asks for food so people know they can
  let fed = false;
  let nextHint = performance.now() + rand(6000, 10000);

  const marginWidth = () => (window.innerWidth - contentWidth) / 2 + 16;
  const inMargin = (x, y) => {
    const m = marginWidth();
    return (x < m || x > window.innerWidth - m) && y > yRange()[0] && y < window.innerHeight - 24;
  };
  const canFeed = () => mode === "sides" && !reduceMotion;
  const feedHint = document.querySelector(".feed-hint");

  const dropPellet = (x, y, now) => {
    if (pellets.length >= maxPellets) removePellet(pellets[0]);
    const el = document.createElement("span");
    el.className = "gourami-pellet";
    document.body.appendChild(el);
    pellets.push({ el, x, y, born: now, side: x < window.innerWidth / 2 ? "left" : "right" });
  };

  const removePellet = (p) => {
    p.el.remove();
    pellets.splice(pellets.indexOf(p), 1);
  };
  const clearPellets = () => [...pellets].forEach(removePellet);

  const updatePellets = (dt, now) => {
    const floor = window.innerHeight - 24;
    [...pellets].forEach((p) => {
      const age = now - p.born;
      if (age > pelletLife) return removePellet(p);
      p.y = Math.min(floor, p.y + 16 * dt);
      const drift = p.y < floor ? Math.sin(age / 400) * 2 : 0;
      p.el.style.transform = `translate(${p.x + drift}px, ${p.y}px)`;
      p.el.style.opacity = Math.min(1, (pelletLife - age) / 1500);
    });
  };

  // Where the mouth is when facing right/left (fractions of the fish's box)
  const mouthX = (facingLeft) => size().w * (facingLeft ? 0.06 : 0.94);
  const mouthY = () => size().h * 0.45;

  // The closest pellet on the fish's own side, if one is near enough to bother with
  const nearestFood = () => {
    const { w } = size();
    const cx = pos.x + w / 2;
    const cy = pos.y + mouthY();
    let best = null;
    let bestDist = reach;
    pellets.forEach((p) => {
      if (p.side !== side) return;
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < bestDist) [best, bestDist] = [p, d];
    });
    return best;
  };

  const place = (bob = 0, tilt = 0) => {
    fish.style.transform = `translate(${pos.x}px, ${pos.y + bob}px) rotate(${tilt}deg)`;
  };

  const spawnBubble = (text, linger = false) => {
    if (pos.x < 0 || pos.x > window.innerWidth - size().w) return;
    const { w, h } = size();
    // Bubbles are fixed to the viewport; in hero mode the fish's position is in page coordinates
    const top = mode === "hero" ? pos.y - window.scrollY : pos.y;
    const facingLeft = fish.classList.contains("is-left");
    const b = document.createElement("span");
    b.className = text ? "gourami-bubble gourami-bubble--hi" : "gourami-bubble";
    if (text) b.textContent = text;
    if (linger) b.classList.add("gourami-bubble--linger");
    b.style.left = `${pos.x + (facingLeft ? w * 0.02 : w * 0.92)}px`;
    b.style.top = `${top + h * 0.3 - (text ? 18 : 0)}px`;
    document.body.appendChild(b);
    b.addEventListener("animationend", () => b.remove());
  };

  // End of the intro: switch from page to viewport coordinates and head for the right margin, where the hero is
  // empty. The fish swims across at about the height it's at, stays in front of the hero's glass on the way
  // ("is-surfacing") and drops behind once it arrives.
  let leaveScrollY = 0;
  const leaveHero = () => {
    intro = false;
    mode = "sides";
    fish.classList.remove("is-hero");
    side = "right";
    pausedUntil = 0;
    pos.y -= window.scrollY;
    fish.classList.add("is-surfacing");
    phase = "leave";
    leaveScrollY = window.scrollY;
    target = pickTarget();
    const [minY, maxY] = yRange();
    target.y = Math.min(Math.max(pos.y + rand(-30, 30), minY), maxY);
  };
  // Used when the page was scrolled until the fish in the hero went out of view: it comes into the margin from the edge
  const enterFromEdge = () => {
    intro = false;
    mode = "sides";
    fish.classList.remove("is-hero");
    side = "right";
    pausedUntil = 0;
    fish.classList.remove("is-surfacing");
    const [minY, maxY] = yRange();
    pos = { x: window.innerWidth + 30, y: rand(minY, maxY) };
    vel = { x: 0, y: 0 };
    phase = "enter";
    target = pickTarget();
  };

  const arrive = (now) => {
    const { w } = size();
    if (phase === "leave") fish.classList.remove("is-surfacing");
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
    // Beside the button it lingers longer between little drifts
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

    if (intro) {
      // The fish scrolls with the hero; it only leaves once it's been scrolled fully out of view, or after a few seconds
      const top = pos.y - window.scrollY;
      if (top + size().h < 0 || top > window.innerHeight) enterFromEdge();
      else if (now > introUntil) leaveHero();
    } else if (phase === "leave" && Math.abs(window.scrollY - leaveScrollY) > 120) {
      // Scrolled while crossing: the content has moved under it, so slip behind the page for the rest of the way
      fish.classList.remove("is-surfacing");
    }

    updatePellets(dt, now);
    // Food nearby turns the fish around even if it was about to swim off this side (but not while it's off screen,
    // or still on its way out of the hero)
    const food = mode === "sides" && phase !== "enter" && phase !== "leave" ? nearestFood() : null;
    if (food) {
      phase = null;
      // Line the mouth up with the pellet, approaching from whichever side the fish is on
      const facingLeft = food.x < pos.x + size().w / 2;
      target = { x: food.x - mouthX(facingLeft), y: food.y - mouthY() };
      pausedUntil = 0;
    }

    if (now > pausedUntil) {
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);

      if (food && dist < 14) {
        removePellet(food);
        fed = true;
        spawnBubble("yum!");
        pausedUntil = now + rand(600, 1400);
        target = pickTarget();
      } else if (dist < 12) {
        arrive(now);
      } else {
        // Food gets a quicker, more eager swim that doesn't slow to a crawl as the pellet sinks
        // and swimming off out of the hero is brisk, so it doesn't loiter in front of the page
        const cruise = phase === "leave" ? 110 : phase ? 55 : 38;
        const speed = food ? Math.min(75, Math.max(30, dist * 1.2)) : Math.min(cruise, Math.max(phase === "leave" ? 40 : 0, dist * 0.6));
        const steer = food ? 0.05 : 0.03;
        vel.x += ((dx / dist) * speed - vel.x) * steer;
        vel.y += ((dy / dist) * speed - vel.y) * steer;
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
    if (feedHint) feedHint.classList.toggle("is-shown", !fed && canFeed());
    if (!fed && canFeed() && !phase && now > nextHint) {
      spawnBubble("snack?", true);
      nextHint = now + rand(25000, 40000);
    }

    const tilt = Math.max(-10, Math.min(10, vel.y * 0.3)) * (vel.x < 0 ? -1 : 1);
    place(Math.sin(now / 700) * 3, tilt);
    requestAnimationFrame(swim);
  };

  const applyMode = () => {
    mode = intro ? "hero" : getMode();
    fish.classList.toggle("is-hero", mode === "hero");
    fish.style.visibility = mode ? "visible" : "hidden";
    if (!canFeed()) {
      clearPellets();
      root.classList.remove("can-feed");
    }
  };

  const rest = () => {
    // Reduced motion: rest quietly low in the right margin (or beside the social buttons in narrow windows) instead of swimming
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
    if (intro && !fits()) intro = false;
    const prev = mode;
    applyMode();
    if (mode !== prev) {
      // Switched between the margins and the hero spot: start over in the new area
      fish.classList.remove("is-surfacing");
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
  const interactive = "a, button, input, textarea, label, .card, #nav";
  document.addEventListener("click", (e) => {
    if (fish.style.visibility === "hidden") return;
    if (e.target.closest(interactive)) return;
    const r = fish.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
      if (canFeed() && inMargin(e.clientX, e.clientY)) dropPellet(e.clientX, e.clientY, performance.now());
      return;
    }
    spawnBubble("hi!");
    if (reduceMotion) return;
    fish.classList.remove("is-spinning");
    void fish.offsetWidth;
    fish.classList.add("is-spinning");
  });
  fish.addEventListener("animationend", () => fish.classList.remove("is-spinning"));

  // Show a pointer over the empty margins so it's clear they can be clicked
  document.addEventListener("mousemove", (e) => {
    const feedable = canFeed() && inMargin(e.clientX, e.clientY) && !e.target.closest(interactive);
    root.classList.toggle("can-feed", feedable);
  }, { passive: true });
}

// ============ FOOTER YEAR ============
document.getElementById("year").textContent = new Date().getFullYear();
