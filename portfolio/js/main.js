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
const roles = ["Web Developer", "Operations Planner", "CS Graduate", "Excel & Data Tools Builder"];
const typedEl = document.getElementById("typed");
let roleIndex = 0;
let charIndex = 0;
let deleting = false;

function type() {
  const current = roles[roleIndex];
  charIndex += deleting ? -1 : 1;
  typedEl.textContent = current.slice(0, charIndex);

  let delay = deleting ? 45 : 90;
  if (!deleting && charIndex === current.length) {
    delay = 1800;
    deleting = true;
  } else if (deleting && charIndex === 0) {
    deleting = false;
    roleIndex = (roleIndex + 1) % roles.length;
    delay = 400;
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
// No backend yet: this opens the visitor's email app with the message filled in.
// To receive messages directly, swap in a service like Formspree later.
const form = document.getElementById("contactForm");
const formNote = document.getElementById("formNote");
const YOUR_EMAIL = "anthonydanrivera@gmail.com";

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const subject = encodeURIComponent(`Portfolio message from ${data.get("name")}`);
  const body = encodeURIComponent(`${data.get("message")}\n\n— ${data.get("name")} (${data.get("email")})`);
  window.location.href = `mailto:${YOUR_EMAIL}?subject=${subject}&body=${body}`;
  formNote.textContent = "Opening your email app…";
  form.reset();
});

// ============ FOOTER YEAR ============
document.getElementById("year").textContent = new Date().getFullYear();
