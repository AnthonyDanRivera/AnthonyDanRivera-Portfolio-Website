// Two honey gouramis share food and occasionally pause to explore each other's feelers.
(() => {
  const elements = [...document.querySelectorAll(".gourami")];
  if (!elements.length) return;

  const root = document.documentElement;
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = motionPreference.matches;
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const contentWidth = 1000; // matches --maxw in style.css
  const hero = document.querySelector(".hero");
  const perch = hero?.querySelector(".socials .social-btn:last-child");
  const feedHint = document.querySelector(".feed-hint");
  const swimmers = [];
  const pellets = [];
  let fed = false;
  let nextHint = performance.now() + rand(6000, 10000);
  let nextMeeting = performance.now() + rand(14000, 22000);
  let nextNearbyMeeting = nextMeeting - 5000;
  let meeting = null;
  let frame = null;
  let last = performance.now();

  const marginWidth = () => (window.innerWidth - contentWidth) / 2 + 16;
  const fits = () => marginWidth() >= Math.max(...elements.map((el) => el.offsetWidth)) + 8;
  const getMode = () => fits() ? "sides" : perch ? "hero" : null;
  const canFeed = () => !reduceMotion && swimmers.some((f) => f.mode === "sides");
  const inMargin = (x, y) => (x < marginWidth() || x > window.innerWidth - marginWidth()) &&
    y > 90 && y < window.innerHeight - 24;

  // The hero is measured at most a few times a second (and again after a resize) rather than every frame.
  // Rects are stored with the scroll position they were read at, so the page coordinates below stay valid.
  let heroLayout = null;
  const measureHero = () => {
    const now = performance.now();
    if (!heroLayout || now - heroLayout.at > 250) {
      heroLayout = { at: now, scrollY: window.scrollY, perch: perch.getBoundingClientRect(),
        hero: hero.getBoundingClientRect(), sizes: elements.map((el) => ({ w: el.offsetWidth, h: el.offsetHeight })) };
    }
    return heroLayout;
  };

  // Both fish share one stretch of open water in the hero and swim it all the way to the edge of the box,
  // a few pixels apart in depth so they can pass each other: beside the social links when there's room for
  // both, otherwise (phones) the full width of the hero just below the row of buttons.
  const heroBox = (index) => {
    const { sizes, scrollY, perch: b, hero: h } = measureHero();
    const total = sizes.reduce((sum, s) => sum + s.w, 0) + 12 * (sizes.length - 1);
    const beside = h.right - 12 - (b.right + 12) >= total + 24;
    const y = (beside ? b.top + b.height / 2 - sizes[index].h / 2 :
      h.bottom - Math.max(...sizes.map((s) => s.h)) / 2 - 6) + scrollY + (index % 2 ? 6 : -6);
    return { x: [beside ? b.right + 12 : h.left + 12, h.right - 12 - sizes[index].w], y: [y - 3, y + 3] };
  };

  const removePellet = (p) => {
    const index = pellets.indexOf(p);
    if (index < 0) return;
    p.el.remove();
    pellets.splice(index, 1);
  };
  const clearPellets = () => [...pellets].forEach(removePellet);
  const dropPellet = (x, y, now) => {
    if (pellets.length >= 6) removePellet(pellets[0]);
    const el = document.createElement("span");
    el.className = "gourami-pellet";
    document.body.appendChild(el);
    pellets.push({ el, x, y, born: now, side: x < window.innerWidth / 2 ? "left" : "right" });
  };
  const updatePellets = (dt, now) => {
    for (const p of [...pellets]) {
      const age = now - p.born;
      if (age > 12000) { removePellet(p); continue; }
      const floor = window.innerHeight - 24;
      p.y = Math.min(floor, p.y + 16 * dt);
      const drift = p.y < floor ? Math.sin(age / 400) * 2 : 0;
      p.el.style.transform = `translate(${p.x + drift}px, ${p.y}px)`;
      p.el.style.opacity = Math.min(1, (12000 - age) / 1500);
    }
  };

  const createSwimmer = (el, index) => {
    const size = () => ({ w: el.offsetWidth, h: el.offsetHeight });
    const yRange = () => [90, Math.max(90, window.innerHeight - size().h - 40)];
    const sideRange = (side) => side === "left" ? [8, marginWidth() - size().w] :
      [window.innerWidth - marginWidth(), window.innerWidth - size().w - 8];
    let intro = !reduceMotion && !!perch && getMode() === "sides" && window.scrollY < 150;
    const introUntil = performance.now() + 1500 + index * 700;
    let mode = intro ? "hero" : getMode();
    let side = Math.random() < 0.5 ? "left" : "right";
    let phase = null;
    let pausedUntil = 0;
    let nextBubble = performance.now() + rand(4000, 8000);
    let leaveScrollY = 0;
    let social = null;
    let vel = { x: 0, y: 0 };
    const pickTarget = () => {
      const { x, y } = mode === "hero" ? heroBox(index) : { x: sideRange(side), y: yRange() };
      return { x: rand(x[0], Math.max(x[0], x[1])), y: rand(y[0], y[1]) };
    };
    let pos = pickTarget();
    let target = pickTarget();
    const feelers = [...el.querySelectorAll(".gourami__feelers path")].map((path) => ({
      path, original: path.getAttribute("d"),
      points: path.getAttribute("d").match(/-?\d+(?:\.\d+)?/g).map(Number),
    }));
    const place = (bob = 0, tilt = 0) => {
      el.style.transform = `translate(${pos.x}px, ${pos.y + bob}px) rotate(${tilt}deg)`;
    };
    const applyMode = () => {
      el.classList.toggle("is-hero", mode === "hero");
      el.style.visibility = mode ? "visible" : "hidden";
    };
    const spawnBubble = (text, linger = false, offsetY = 0) => {
      const { w, h } = size();
      const top = pos.y - (mode === "hero" ? window.scrollY : 0);
      if (pos.x < 0 || pos.x > window.innerWidth - w || top + h < 0 || top > window.innerHeight) return;
      const b = document.createElement("span");
      b.className = text ? "gourami-bubble gourami-bubble--hi" : "gourami-bubble";
      if (text) b.textContent = text;
      if (linger) b.classList.add("gourami-bubble--linger");
      if (mode === "hero" || phase === "leave") b.classList.add("gourami-bubble--front");
      b.style.left = `${pos.x + (el.classList.contains("is-left") ? w * 0.02 : w * 0.92)}px`;
      b.style.top = `${top + h * 0.3 - (text ? 18 : 0) + offsetY}px`;
      document.body.appendChild(b);
      b.addEventListener("animationend", () => b.remove());
      // Reduced-motion styles suppress animationend, so bubbles also have a timed cleanup.
      setTimeout(() => b.remove(), linger ? 5600 : 2800);
    };
    const nearestFood = () => {
      if (mode !== "sides" || phase === "enter" || phase === "leave") return null;
      let best = null;
      let distance = 420;
      for (const p of pellets) {
        if (p.side !== side) continue;
        const d = Math.hypot(p.x - pos.x - size().w / 2, p.y - pos.y - size().h * 0.45);
        if (d < distance) { best = p; distance = d; }
      }
      return best;
    };
    const leaveHero = () => {
      intro = false;
      mode = "sides";
      side = "right";
      pausedUntil = 0;
      pos.y -= window.scrollY;
      el.classList.remove("is-hero");
      el.classList.add("is-surfacing");
      phase = "leave";
      leaveScrollY = window.scrollY;
      target = pickTarget();
      target.y = clamp(pos.y + (index ? 55 : -25), ...yRange());
    };
    const enterFromEdge = () => {
      intro = false;
      mode = "sides";
      side = "right";
      pausedUntil = 0;
      el.classList.remove("is-hero", "is-surfacing");
      pos = { x: window.innerWidth + 30, y: rand(...yRange()) };
      vel = { x: 0, y: 0 };
      phase = "enter";
      target = pickTarget();
    };
    const arrive = (now) => {
      if (phase === "leave") el.classList.remove("is-surfacing");
      if (phase === "exit") {
        side = side === "left" ? "right" : "left";
        pos.x = side === "left" ? -size().w - 30 : window.innerWidth + 30;
        vel.x = 0;
        phase = "enter";
        target = pickTarget();
        return;
      }
      phase = null;
      pausedUntil = now + (mode === "hero" ? rand(3000, 7000) : rand(1200, 3500));
      if (mode === "sides" && Math.random() < 0.3) {
        phase = "exit";
        target = { x: side === "left" ? -size().w - 30 : window.innerWidth + 30, y: rand(...yRange()) };
      } else target = pickTarget();
    };
    const update = (now, dt) => {
      if (!mode) return;
      if (intro) {
        const top = pos.y - window.scrollY;
        if (top + size().h < 0 || top > window.innerHeight) enterFromEdge();
        else if (now > introUntil) leaveHero();
      } else if (phase === "leave" && Math.abs(window.scrollY - leaveScrollY) > 120) {
        el.classList.remove("is-surfacing");
      }

      // During a meeting, face one another and settle before extending the feelers.
      if (social) {
        const dx = social.x - pos.x;
        const dy = social.y - pos.y;
        const distance = Math.hypot(dx, dy);
        const speed = Math.min(44, distance * 2.5);
        const steer = 1 - Math.exp(-6 * dt);
        vel.x += ((distance ? dx / distance * speed : 0) - vel.x) * steer;
        vel.y += ((distance ? dy / distance * speed : 0) - vel.y) * steer;
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        if (distance < 0.5) { pos = { x: social.x, y: social.y }; vel = { x: 0, y: 0 }; }
        place();
        return;
      }

      const food = nearestFood();
      if (food) {
        phase = null;
        const left = food.x < pos.x + size().w / 2;
        target = { x: clamp(food.x - size().w * (left ? 0.06 : 0.94), ...sideRange(side)),
          y: Math.max(90, food.y - size().h * 0.45) };
        pausedUntil = 0;
      }
      if (now > pausedUntil) {
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const distance = Math.hypot(dx, dy);
        if (food && Math.hypot(food.x - pos.x - size().w * (el.classList.contains("is-left") ? 0.06 : 0.94),
          food.y - pos.y - size().h * 0.45) < 16) {
          removePellet(food);
          fed = true;
          spawnBubble("yum!");
          pausedUntil = now + rand(600, 1400);
          target = pickTarget();
        } else if (distance < 12 && !food) arrive(now);
        else if (distance > 0.1) {
          const cruise = phase === "leave" ? 110 : phase ? 55 : 38;
          const speed = food ? Math.min(75, Math.max(30, distance * 1.2)) :
            Math.min(cruise, Math.max(phase === "leave" ? 40 : 0, distance * 0.6));
          const steer = 1 - Math.exp(-(food ? 3 : 1.8) * dt);
          vel.x += (dx / distance * speed - vel.x) * steer;
          vel.y += (dy / distance * speed - vel.y) * steer;
        }
      } else {
        vel.x *= Math.exp(-2.5 * dt);
        vel.y *= Math.exp(-2.5 * dt);
      }

      // A little vertical separation prevents the bodies drifting through each other.
      if (!phase && !food) for (const other of swimmers) {
        if (other.el === el || other.mode !== mode || (mode === "sides" && other.side !== side)) continue;
        const dx = pos.x + size().w / 2 - other.pos.x - other.size().w / 2;
        const dy = pos.y + size().h * 0.45 - other.pos.y - other.size().h * 0.45;
        if (Math.abs(dx) < (size().w + other.size().w) * 0.36 &&
          Math.abs(dy) < (size().h + other.size().h) * 0.28) {
          vel.y += (dy === 0 ? index ? 1 : -1 : Math.sign(dy)) * 45 * dt;
        }
      }
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      if (!phase) {
        const bounds = mode === "hero" ? heroBox(index) : { x: sideRange(side), y: yRange() };
        pos.x = clamp(pos.x, ...bounds.x);
        pos.y = food ? clamp(pos.y, 90, window.innerHeight - size().h * 0.45 - 18) : clamp(pos.y, ...bounds.y);
      }
      if (Math.abs(vel.x) > 4) el.classList.toggle("is-left", vel.x < 0);
      if (now > nextBubble) { spawnBubble(); nextBubble = now + rand(5000, 10000); }
      const tilt = clamp(vel.y * 0.3, -10, 10) * (vel.x < 0 ? -1 : 1);
      place(Math.sin(now / 700 + index * 2) * 3, tilt);
    };

    const endMeeting = (now) => {
      social = null;
      el.classList.remove("is-social");
      for (const f of feelers) f.path.setAttribute("d", f.original);
      target = pickTarget();
      pausedUntil = now + rand(600, 1400);
    };
    const startMeeting = (goal) => {
      social = goal;
      vel = { x: 0, y: 0 };
      el.classList.remove("is-spinning");
      el.classList.add("is-social");
      el.classList.toggle("is-left", goal.left);
    };
    const touch = (point, amount) => {
      const { w, h } = size();
      for (const [i, f] of feelers.entries()) {
        const globalX = point.x + (i ? 1.5 : -1.5);
        const x = (social.left ? w - (globalX - pos.x) : globalX - pos.x) * 200 / w;
        const y = (point.y + (i ? 1 : -1) - pos.y) * 128 / h;
        const [sx, sy] = f.points;
        const reached = [sx, sy, sx + (x - sx) * 0.2, sy + 22, x - (x - sx) * 0.2, y - 12, x, y];
        const p = f.points.map((value, j) => (value + (reached[j] - value) * amount).toFixed(2));
        f.path.setAttribute("d", `M${p[0]} ${p[1]} C${p[2]} ${p[3]} ${p[4]} ${p[5]} ${p[6]} ${p[7]}`);
      }
    };
    const rest = () => {
      intro = false;
      mode = getMode();
      side = "right";
      phase = null;
      vel = { x: 0, y: 0 };
      el.classList.remove("is-surfacing", "is-spinning");
      applyMode();
      if (mode === "hero") {
        // They share the hero's open water, so they rest side by side at its right end
        const { x, y } = heroBox(index);
        const after = elements.slice(index + 1).reduce((sum, other) => sum + other.offsetWidth + 12, 0);
        pos = { x: x[1] - after, y: y[1] };
      } else pos = { x: sideRange(side)[1], y: Math.max(90, yRange()[1] - (elements.length - 1 - index) * (size().h + 18)) };
      place();
    };
    // Only a switch between the margins and the hero starts the fish over; otherwise it keeps swimming
    // (or greeting, or crossing) and is just kept in bounds.
    const resize = () => {
      if (reduceMotion) return rest();
      if (intro && !fits()) intro = false;
      const previous = mode;
      mode = intro ? "hero" : getMode();
      applyMode();
      if (!mode) return;
      if (mode !== previous) {
        phase = null;
        vel = { x: 0, y: 0 };
        el.classList.remove("is-surfacing");
        pos = pickTarget();
        target = pickTarget();
        return place();
      }
      if (phase || social) return;
      const bounds = mode === "hero" ? heroBox(index) : { x: sideRange(side), y: yRange() };
      pos = { x: clamp(pos.x, ...bounds.x), y: clamp(pos.y, ...bounds.y) };
      target = pickTarget();
      place();
    };
    const greet = () => {
      spawnBubble("hi!");
      if (reduceMotion) return;
      el.classList.remove("is-spinning");
      void el.offsetWidth;
      el.classList.add("is-spinning");
    };
    el.addEventListener("animationend", () => el.classList.remove("is-spinning"));
    if (reduceMotion) rest();
    else { applyMode(); place(); }

    return { el, size, update, nearestFood, spawnBubble, startMeeting, endMeeting, touch, resize, greet,
      get pos() { return pos; }, get mode() { return mode; }, get side() { return side; },
      get settled() { return social && Math.hypot(pos.x - social.x, pos.y - social.y) < 0.6; },
      get canMeet() {
        const top = pos.y - (mode === "hero" ? window.scrollY : 0);
        return mode && !intro && !phase && !el.classList.contains("is-spinning") &&
          top >= 80 && top + size().h < window.innerHeight - 16;
      },
    };
  };

  elements.forEach((el, index) => swimmers.push(createSwimmer(el, index)));

  const endMeeting = (now) => {
    if (meeting) meeting.pair.forEach((f) => f.endMeeting(now));
    meeting = null;
    nextMeeting = now + rand(24000, 42000);
    nextNearbyMeeting = nextMeeting - 6000;
  };
  const planMeeting = (a, b) => {
    const sa = a.size();
    const sb = b.size();
    let left, right, top, bottom;
    if (a.mode === "hero") {
      const boxes = [heroBox(0), heroBox(1)];
      left = boxes[0].x[0];
      right = boxes[1].x[1] + sb.w;
      top = (boxes[0].y[0] + boxes[1].y[0]) / 2;
      bottom = top + Math.max(sa.h, sb.h);
    } else {
      left = a.side === "left" ? 8 : window.innerWidth - marginWidth();
      right = a.side === "left" ? marginWidth() : window.innerWidth - 8;
      top = 100;
      bottom = window.innerHeight - 40;
    }
    const across = right - left >= sa.w + sb.w + 10;
    const offsetY = across ? 0 : sa.h * 0.58;
    const height = Math.max(sa.h, offsetY + sb.h);
    if (bottom - top < height - 1) return null;
    const y = clamp((a.pos.y + b.pos.y - offsetY) / 2, top, bottom - height);
    const width = across ? sa.w + sb.w + 10 : Math.max(sa.w, sb.w);
    const x = (left + right - width) / 2;
    const goals = [{ x, y, left: false },
      { x: across ? x + sa.w + 10 : right - sb.w, y: y + offsetY, left: true }];
    const point = { x: across ? x + sa.w + 5 : (left + right) / 2,
      y: Math.max(y + sa.h * 0.92, goals[1].y + sb.h * 0.92) };
    return { goals, point };
  };
  const updateMeeting = (now) => {
    if (meeting) {
      const { pair } = meeting;
      if (pair.some((f) => !f.canMeet || f.nearestFood()) || now - meeting.started > 22000) return endMeeting(now);
      if (meeting.touching === null && pair.every((f) => f.settled)) {
        meeting.touching = now;
        // Separate the greetings vertically so both remain readable when the fish face each other.
        pair.forEach((f, index) => f.spawnBubble("hi!", false, index ? -28 : 0));
      }
      if (meeting.touching !== null) {
        const elapsed = now - meeting.touching;
        if (elapsed >= 3200) return endMeeting(now);
        const reach = clamp(Math.min(elapsed / 900, (3200 - elapsed) / 900), 0, 1);
        const ease = reach * reach * (3 - 2 * reach);
        pair.forEach((f) => f.touch(meeting.point, ease));
      }
      return;
    }
    if (now < nextNearbyMeeting || swimmers.length < 2) return;
    const [a, b] = swimmers;
    // Nearby fish can meet a little sooner, with the usual cooldown for distant fish.
    if (now < nextMeeting) {
      const sa = a.size();
      const sb = b.size();
      const distance = Math.hypot(a.pos.x + sa.w / 2 - b.pos.x - sb.w / 2,
        a.pos.y + sa.h * 0.45 - b.pos.y - sb.h * 0.45);
      if (distance > Math.max(sa.w, sb.w) * 1.8) return;
    }
    if (!a.canMeet || !b.canMeet || a.mode !== b.mode ||
      (a.mode === "sides" && a.side !== b.side) || a.nearestFood() || b.nearestFood()) {
      nextNearbyMeeting = now + 2000;
      nextMeeting = Math.max(nextMeeting, nextNearbyMeeting);
      return;
    }
    const plan = planMeeting(a, b);
    if (!plan) {
      nextNearbyMeeting = now + 4000;
      nextMeeting = Math.max(nextMeeting, nextNearbyMeeting);
      return;
    }
    [a, b].forEach((f, i) => f.startMeeting(plan.goals[i]));
    meeting = { pair: [a, b], point: plan.point, started: now, touching: null };
  };

  const swim = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    updatePellets(dt, now);
    updateMeeting(now);
    swimmers.forEach((f) => f.update(now, dt));
    if (feedHint) feedHint.classList.toggle("is-shown", !fed && canFeed());
    if (!fed && canFeed() && !meeting && now > nextHint) {
      const f = swimmers.find((f) => f.mode === "sides" && f.canMeet);
      if (f) f.spawnBubble("snack?", true);
      nextHint = now + rand(25000, 40000);
    }
    frame = requestAnimationFrame(swim);
  };
  if (!reduceMotion) frame = requestAnimationFrame(swim);

  // Phone browsers fire resize as the address bar slides in and out while scrolling. Those height-only
  // changes leave a greeting alone; it still ends by itself if the fish get pushed out of view.
  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    heroLayout = null;
    if (window.innerWidth !== lastWidth) endMeeting(performance.now());
    lastWidth = window.innerWidth;
    swimmers.forEach((f) => f.resize());
    if (!canFeed()) { clearPellets(); root.classList.remove("can-feed"); }
    if (feedHint) feedHint.classList.toggle("is-shown", !fed && canFeed());
  });
  motionPreference.addEventListener("change", (event) => {
    reduceMotion = event.matches;
    endMeeting(performance.now());
    clearPellets();
    root.classList.remove("can-feed");
    swimmers.forEach((f) => f.resize());
    if (frame !== null) cancelAnimationFrame(frame);
    if (feedHint) feedHint.classList.remove("is-shown");
    frame = null;
    if (!reduceMotion) { last = performance.now(); frame = requestAnimationFrame(swim); }
  });

  const interactive = "a, button, input, textarea, select, label, .card, #nav";
  document.addEventListener("click", (event) => {
    if (event.target.closest(interactive)) return;
    const hit = [...swimmers].reverse().find((f) => {
      if (f.el.style.visibility === "hidden") return false;
      const r = f.el.getBoundingClientRect();
      return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
    });
    if (hit) { endMeeting(performance.now()); hit.greet(); }
    else if (canFeed() && inMargin(event.clientX, event.clientY)) {
      endMeeting(performance.now());
      dropPellet(event.clientX, event.clientY, performance.now());
    }
  });
  document.addEventListener("mousemove", (event) => {
    root.classList.toggle("can-feed", canFeed() && inMargin(event.clientX, event.clientY) && !event.target.closest(interactive));
  }, { passive: true });
})();
