const header = document.querySelector(".site-header");
const menu = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");
const topButton = document.querySelector(".top-button");

if (menu && nav) {
  menu.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    document.body.classList.toggle("menu-open", open);
    menu.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      document.body.classList.remove("menu-open");
      menu.setAttribute("aria-expanded", "false");
    }),
  );
}
window.addEventListener("scroll", () => {
  if (header) header.classList.toggle("scrolled", window.scrollY > 35);
  if (topButton) topButton.classList.toggle("show", window.scrollY > 600);
});
if (topButton)
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
  { threshold: 0.1 },
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

const form = document.querySelector("#contactForm");
if (form)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = new FormData(form).get("name")?.trim().split(" ")[0] || "";
    form.querySelector(".form-status").textContent =
      `Gracias${name ? `, ${name}` : ""}. Recibimos tu solicitud demostrativa.`;
    form.reset();
  });

const filterButtons = document.querySelectorAll(".filter");
const doctorCards = document.querySelectorAll(".directory-grid .doctor-card");
const doctorSearch = document.querySelector("#doctorSearch");
function filterDoctors() {
  if (!doctorCards.length) return;
  const active =
    document.querySelector(".filter.active")?.dataset.filter || "all";
  const query = (doctorSearch?.value || "").toLowerCase().trim();
  let visible = 0;
  doctorCards.forEach((card) => {
    const categoryMatch = active === "all" || card.dataset.category === active;
    const textMatch = !query || card.dataset.search.includes(query);
    const show = categoryMatch && textMatch;
    card.classList.toggle("hidden", !show);
    if (show) visible++;
  });
  document
    .querySelector(".empty-state")
    ?.classList.toggle("show", visible === 0);
}
filterButtons.forEach((button) =>
  button.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    filterDoctors();
  }),
);
doctorSearch?.addEventListener("input", filterDoctors);

const doctors = {
  carlos: {
    name: "Dr. Carlos Mendoza",
    tag: "Medicina deportiva",
    specialty: "Especialista en Medicina Deportiva",
    license: "CMP 123456",
    experience: "10 años de experiencia",
    image: "img/dr-carlos-mendoza.png",
    summary: "Prevención y recuperación de lesiones deportivas.",
    bio: "Especialista en valoración y recuperación funcional.",
    services: [
      "Evaluación deportiva",
      "Prevención de lesiones",
      "Recuperación funcional",
      "Retorno a la actividad",
    ],
    wa: "Hola, deseo una cita con el Dr. Carlos Mendoza",
  },
  ana: {
    name: "Dra. Ana Torres",
    tag: "Nutrición clínica",
    specialty: "Especialista en Nutrición Clínica",
    license: "CNP 12345",
    experience: "8 años de experiencia",
    image: "img/dra-ana-torres.png",
    summary: "Evaluación y planes nutricionales personalizados.",
    bio: "Especialista en nutrición clínica y educación alimentaria.",
    services: [
      "Evaluación nutricional",
      "Plan alimentario",
      "Nutrición metabólica",
      "Seguimiento",
    ],
    wa: "Hola, deseo una cita con la Dra. Ana Torres",
  },
  luis: {
    name: "Dr. Luis Ramírez",
    tag: "Medicina familiar",
    specialty: "Especialista en Medicina Familiar",
    license: "CMP 654321",
    experience: "15 años de experiencia",
    image: "img/dr-luis-ramirez.png",
    summary: "Prevención y atención médica para adultos y familias.",
    bio: "Especialista en prevención y seguimiento integral.",
    services: [
      "Consulta general",
      "Control preventivo",
      "Seguimiento",
      "Orientación familiar",
    ],
    wa: "Hola, deseo una cita con el Dr. Luis Ramírez",
  },
};
const profile = document.querySelector("#doctorProfile");
if (profile) {
  const key = new URLSearchParams(location.search).get("doctor") || "carlos";
  const d = doctors[key] || doctors.carlos;
  document.title = `${d.name} | Dr. Consulta`;
  document.querySelector("#profileImage").src = d.image;
  document.querySelector("#profileImage").alt = d.name;
  document.querySelector("#profileTag").textContent = d.tag;
  document.querySelector("#profileName").textContent = d.name;
  document.querySelector("#profileSpecialty").textContent = d.specialty;
  document.querySelector("#profileLicense").textContent = d.license;
  document.querySelector("#profileExperience").textContent = d.experience;
  document.querySelector("#profileSummary").textContent = d.summary;
  document.querySelector("#profileBio").textContent = d.bio;
  document.querySelector("#profileServices").innerHTML = d.services
    .map((s) => `<span>${s}</span>`)
    .join("");
  document.querySelector("#profileWhatsapp").href =
    `https://wa.me/51999999999?text=${encodeURIComponent(d.wa)}`;
  document.querySelector("#profileBooking").addEventListener("click", () => {
    location.href = `https://wa.me/51999999999?text=${encodeURIComponent(d.wa + " - deseo confirmar fecha y horario")}`;
  });
}
