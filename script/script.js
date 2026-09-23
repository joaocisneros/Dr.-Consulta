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

const medicalChat = document.querySelector(".medical-chat");
if (medicalChat) {
  const chatStorageKey = "drConsultaChatHistory";
  const chatOpenKey = "drConsultaChatOpen";
  const launcher = medicalChat.querySelector(".chat-launcher");
  const panel = medicalChat.querySelector(".chat-panel");
  const close = medicalChat.querySelector(".chat-close");
  const reset = medicalChat.querySelector(".chat-reset");
  const messages = medicalChat.querySelector(".chat-messages");
  const chatForm = medicalChat.querySelector(".chat-form");
  const chatInput = chatForm.querySelector("input");
  const toggleChat = (open) => {
    medicalChat.classList.toggle("open", open);
    launcher.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    sessionStorage.setItem(chatOpenKey, String(open));
    if (open) window.setTimeout(() => chatInput.focus(), 250);
  };
  launcher.addEventListener("click", () => toggleChat(!medicalChat.classList.contains("open")));
  close.addEventListener("click", () => toggleChat(false));

  const answers = {
    especialidad: "Cuéntame brevemente qué tipo de atención buscas. Puedo orientarte entre medicina familiar, deportiva o nutrición clínica.",
    cita: "Puedes reservar desde el botón Agendar cita. Si prefieres atención personal, también podemos comunicarte con recepción.",
    horario: "Atendemos de lunes a viernes de 8:00 a.m. a 7:00 p.m. La disponibilidad depende de cada especialista.",
  };
  let chatHistory = [];
  try {
    const savedChat = JSON.parse(localStorage.getItem(chatStorageKey) || "null");
    const isRecent = savedChat && Date.now() - savedChat.savedAt < 6 * 60 * 60 * 1000;
    chatHistory = isRecent && Array.isArray(savedChat.items) ? savedChat.items : [];
    const obsoleteError = /Gemini no pudo responder|vista demostrativa|conexión con Gemini aún no está activa|hay muchas consultas en este momento/i;
    chatHistory = chatHistory.reduce((clean, message) => {
      if (message.type === "bot" && obsoleteError.test(message.text || "")) {
        if (clean.at(-1)?.type === "user") clean.pop();
        return clean;
      }
      clean.push(message);
      return clean;
    }, []);
    if (!isRecent) localStorage.removeItem(chatStorageKey);
  } catch {
    chatHistory = [];
  }
  const saveChatHistory = () => localStorage.setItem(
    chatStorageKey,
    JSON.stringify({ items: chatHistory, savedAt: Date.now() }),
  );
  saveChatHistory();
  if (chatHistory.length) {
    messages.querySelector(".chat-message.bot")?.remove();
    messages.querySelector(".chat-options")?.remove();
  }
  const addMessage = (text, type, persist = true) => {
    const item = document.createElement("div");
    item.className = `chat-message ${type}`;
    item.textContent = String(text)
      .replace(/\*\*/g, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^\s*[-•]\s+/gm, "• ")
      .trim();
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    if (persist) {
      chatHistory.push({ text: item.textContent, type });
      chatHistory = chatHistory.slice(-12);
      saveChatHistory();
    }
  };
  chatHistory.forEach((message) => addMessage(message.text, message.type, false));
  if (sessionStorage.getItem(chatOpenKey) === "true") {
    toggleChat(true);
    requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  }
  reset?.addEventListener("click", () => {
    localStorage.removeItem(chatStorageKey);
    sessionStorage.setItem(chatOpenKey, "true");
    location.reload();
  });
  let chatBusy = false;
  const askGemini = async (text) => {
    if (chatBusy) return;
    chatBusy = true;
    chatInput.disabled = true;
    medicalChat.querySelectorAll("[data-chat], .chat-form button").forEach((button) => { button.disabled = true; });
    const waiting = document.createElement("div");
    waiting.className = "chat-message bot chat-waiting";
    waiting.textContent = "Pensando…";
    messages.appendChild(waiting);
    messages.scrollTop = messages.scrollHeight;
    try {
      const localHost = ["localhost", "127.0.0.1", ""].includes(location.hostname);
      const apiUrl = localHost
        ? "http://localhost:4317/api/chat"
        : "https://dr-consulta-api.dr-consulta.workers.dev/api/chat";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      waiting.remove();
      addMessage(data.answer || data.error || "No pude responder en este momento.", "bot");
    } catch {
      waiting.remove();
      addMessage("El asistente no está disponible temporalmente. Inténtalo nuevamente en unos minutos.", "bot");
    } finally {
      chatBusy = false;
      chatInput.disabled = false;
      medicalChat.querySelectorAll("[data-chat], .chat-form button").forEach((button) => { button.disabled = false; });
      chatInput.focus();
    }
  };
  medicalChat.querySelectorAll("[data-chat]").forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.chat;
    addMessage(button.textContent, "user");
    window.setTimeout(() => addMessage(answers[key], "bot"), 250);
  }));
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    addMessage(text, "user");
    chatInput.value = "";
    askGemini(text);
  });
}

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

const specialtyFromUrl = new URLSearchParams(location.search).get("especialidad");
if (specialtyFromUrl && filterButtons.length) {
  const matchingFilter = document.querySelector(
    `.filter[data-filter="${specialtyFromUrl}"]`,
  );
  if (matchingFilter) {
    filterButtons.forEach((button) => button.classList.remove("active"));
    matchingFilter.classList.add("active");
    filterDoctors();
  }
}

const topicsSlider = document.querySelector(".topics-slider");
const topicsTrack = document.querySelector(".topics-track");
if (topicsSlider && topicsTrack) {
  const originalCards = [...topicsTrack.children];
  originalCards.forEach((card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.tabIndex = -1;
    topicsTrack.appendChild(clone);
  });

  const cardStep = () => {
    const card = topicsTrack.querySelector(".topic-card");
    return card ? card.getBoundingClientRect().width + 14 : 238;
  };
  const originalWidth = () => cardStep() * originalCards.length;
  const moveTopics = (direction = 1) => {
    topicsSlider.scrollBy({ left: cardStep() * direction, behavior: "smooth" });
    window.setTimeout(() => {
      if (topicsSlider.scrollLeft >= originalWidth() - 2) topicsSlider.scrollLeft = 0;
      if (topicsSlider.scrollLeft < 1 && direction < 0)
        topicsSlider.scrollLeft = originalWidth() - cardStep();
    }, 520);
  };

  document.querySelector(".topic-next")?.addEventListener("click", () => moveTopics(1));
  document.querySelector(".topic-prev")?.addEventListener("click", () => moveTopics(-1));

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let topicTimer = window.setInterval(() => moveTopics(1), 3200);
    const pauseTopics = () => window.clearInterval(topicTimer);
    const resumeTopics = () => {
      window.clearInterval(topicTimer);
      topicTimer = window.setInterval(() => moveTopics(1), 3200);
    };
    topicsSlider.addEventListener("mouseenter", pauseTopics);
    topicsSlider.addEventListener("mouseleave", resumeTopics);
    topicsSlider.addEventListener("touchstart", pauseTopics, { passive: true });
    topicsSlider.addEventListener("touchend", resumeTopics, { passive: true });
  }
}

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
