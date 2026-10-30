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
    formNote.textContent = "Thanks! I got your message.";
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
    formNote.textContent = "Thanks! I got your message.";
    form.reset();
  } catch {
    openEmailApp(data);
  } finally {
    button.disabled = false;
  }
});

// ============ FOOTER YEAR ============
document.getElementById("year").textContent = new Date().getFullYear();
