const header = document.querySelector(".header"),
  menuButton = document.querySelector(".menu-btn"),
  nav = document.querySelector(".nav"),
  topButton = document.querySelector(".to-top");
function closeMenu() {
  nav.classList.remove("open");
  document.body.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
}
menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  document.body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
});
document
  .querySelectorAll(".nav a")
  .forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 40);
  topButton.classList.toggle("show", window.scrollY > 650);
});
topButton.addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: "smooth" }),
);
const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    }),
  { threshold: 0.12 },
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
const sections = document.querySelectorAll("section[id]"),
  navLinks = document.querySelectorAll(".nav a:not(.nav-cta)");
const sectionObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (entry.isIntersecting)
        navLinks.forEach((link) =>
          link.classList.toggle(
            "active",
            link.getAttribute("href") === `#${entry.target.id}`,
          ),
        );
    }),
  { rootMargin: "-40% 0px -50% 0px" },
);
sections.forEach((section) => sectionObserver.observe(section));
document.querySelectorAll(".accordion details").forEach((item) =>
  item.addEventListener("toggle", () => {
    if (item.open)
      document.querySelectorAll(".accordion details").forEach((other) => {
        if (other !== item) other.open = false;
      });
  }),
);
document.querySelector("#contactForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = new FormData(event.currentTarget)
    .get("name")
    .trim()
    .split(" ")[0];
  document.querySelector("#formNote").textContent =
    `Gracias, ${name}. Recibimos tu solicitud y te contactaremos pronto.`;
  event.currentTarget.reset();
});
