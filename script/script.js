const header = document.querySelector(".site-header");
const menu = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");
const topButton = document.querySelector(".top-button");

// Número de WhatsApp de la clínica (código de país + número, sin espacios).
const whatsappNumber = "51910038666";
const whatsappUrl = (text) =>
  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
const openWhatsApp = (text) => window.open(whatsappUrl(text), "_blank", "noopener");
document.querySelectorAll("[data-wa]").forEach((link) => {
  link.href = whatsappUrl(link.dataset.wa);
});

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
    const data = new FormData(form);
    const field = (key) => String(data.get(key) || "").trim();
    const name = field("name");
    openWhatsApp(
      [
        `Hola, soy ${name}. Deseo orientación de Dr. Consulta.`,
        `Teléfono: ${field("phone")}`,
        `Correo: ${field("email")}`,
        field("message") && `Mensaje: ${field("message")}`,
      ].filter(Boolean).join("\n"),
    );
    form.querySelector(".form-status").textContent =
      `Gracias, ${name.split(" ")[0]}. Completa el envío en WhatsApp y te responderemos pronto.`;
    form.reset();
  });

const bookingSubmit = document.querySelector(".booking-submit");
if (bookingSubmit) {
  const bookingBar = bookingSubmit.closest(".booking-bar");
  bookingSubmit.addEventListener("click", () => {
    const [specialty, doctor, mode] = [...bookingBar.querySelectorAll("select")].map(
      (select) => (select.selectedIndex > 0 || select.name === "mode" ? select.value : ""),
    );
    openWhatsApp(
      [
        "Hola, deseo reservar una cita en Dr. Consulta.",
        specialty && `Especialidad: ${specialty}`,
        doctor && `Profesional: ${doctor}`,
        `Modalidad: ${mode}`,
        "¿Qué horarios tienen disponibles?",
      ].filter(Boolean).join("\n"),
    );
  });
}

const chatMarkup = `
  <aside class="medical-chat" aria-label="Asistente virtual de Dr. Consulta">
    <section class="chat-panel" id="chatPanel" aria-hidden="true">
      <header class="chat-header">
        <div class="chat-doctor-avatar"><img src="img/dr-bot-avatar.webp" width="256" height="256" alt="Dr. Bot" /></div>
        <div><b>Dr. Bot</b><small><i></i> Asistente virtual</small></div>
        <button class="chat-reset" type="button" aria-label="Nueva conversación" title="Nueva conversación">↻</button>
        <button class="chat-close" type="button" aria-label="Cerrar chat">×</button>
      </header>
      <div class="chat-messages" aria-live="polite">
        <div class="chat-message bot">Hola, soy Dr. Bot, asistente de Dr. Consulta. ¿En qué puedo ayudarle?</div>
        <div class="chat-options"><button type="button" data-chat="especialidad">Elegir especialista</button><button type="button" data-chat="cita">Reservar una cita</button><button type="button" data-chat="horario">Ver horarios</button></div>
      </div>
      <form class="chat-form"><input type="text" maxlength="180" placeholder="Escribe tu consulta..." aria-label="Escribe tu consulta" /><button type="submit" aria-label="Enviar mensaje">➜</button></form>
      <small class="chat-disclaimer">Orientación general. No reemplaza una consulta médica.</small>
    </section>
    <button class="chat-launcher" type="button" aria-expanded="false" aria-controls="chatPanel"><span class="robot-doctor"><img src="img/dr-bot-avatar.webp" width="256" height="256" alt="" /></span><span><b>¿Necesitas ayuda?</b><small>Consulta con Dr. Bot</small></span></button>
  </aside>`;
document.body.insertAdjacentHTML("beforeend", chatMarkup);

const medicalChat = document.querySelector(".medical-chat");
if (medicalChat) {
  const chatStorageKey = "drConsultaChat";
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

  const quickAnswers = {
    especialidad: "Con gusto le orientamos. Cuéntenos brevemente qué molestia tiene o qué tipo de atención busca, y le indicaremos la especialidad adecuada.",
    cita: "Puede reservar por WhatsApp al +51 910 038 666 o con el botón Agendar cita. Indíquenos la especialidad y el horario que prefiere, y el equipo le confirmará la cita.",
    horario: "Atendemos de lunes a sábado, de 8:00 a.m. a 7:00 p.m., en modalidad presencial y virtual. La disponibilidad de cada profesional se confirma por WhatsApp.",
  };

  // Los errores se muestran pero no se guardan, para que no contaminen el historial.
  let chatHistory = [];
  try {
    const savedChat = JSON.parse(localStorage.getItem(chatStorageKey) || "null");
    const isRecent = savedChat && Date.now() - savedChat.savedAt < 6 * 60 * 60 * 1000;
    chatHistory = isRecent && Array.isArray(savedChat.items) ? savedChat.items : [];
    if (!isRecent) localStorage.removeItem(chatStorageKey);
    localStorage.removeItem("drConsultaChatHistory");
  } catch {
    chatHistory = [];
  }
  const saveChatHistory = () => {
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify({ items: chatHistory, savedAt: Date.now() }));
    } catch {}
  };
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
  reset.addEventListener("click", () => {
    localStorage.removeItem(chatStorageKey);
    sessionStorage.setItem(chatOpenKey, "true");
    location.reload();
  });
  let chatBusy = false;
  medicalChat.querySelectorAll("[data-chat]").forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.chat;
    addMessage(button.textContent, "user");
    window.setTimeout(() => addMessage(quickAnswers[key], "bot"), 250);
  }));
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
      const productionApi = "https://dr-consulta-api.dr-consulta.workers.dev/api/chat";
      const apiUrl = location.port === "4317"
        ? "/api/chat"
        : ["localhost", "127.0.0.1", ""].includes(location.hostname)
          ? "http://localhost:4317/api/chat"
          : productionApi;
      const request = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatHistory.slice(0, -1).slice(-8).map((item) => ({
            role: item.type === "user" ? "user" : "model",
            text: item.text,
          })),
        }),
      };
      // Si el servidor local está apagado (por ejemplo, con Live Server), se usa el Worker publicado.
      const response = await fetch(apiUrl, request).catch((error) => {
        if (apiUrl === productionApi) throw error;
        return fetch(productionApi, request);
      });
      const data = await response.json();
      waiting.remove();
      if (response.ok && data.answer) addMessage(data.answer, "bot");
      else addMessage(data.error || "No pude responder en este momento.", "bot", false);
    } catch {
      waiting.remove();
      addMessage("El asistente no está disponible temporalmente. Inténtalo nuevamente en unos minutos.", "bot", false);
    } finally {
      chatBusy = false;
      chatInput.disabled = false;
      medicalChat.querySelectorAll("[data-chat], .chat-form button").forEach((button) => { button.disabled = false; });
      chatInput.focus();
    }
  };
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
const normalize = (text) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
function filterDoctors() {
  if (!doctorCards.length) return;
  const active =
    document.querySelector(".filter.active")?.dataset.filter || "all";
  const query = normalize(doctorSearch?.value || "");
  let visible = 0;
  doctorCards.forEach((card) => {
    const categoryMatch = active === "all" || card.dataset.category === active;
    const textMatch = !query || normalize(card.dataset.search).includes(query);
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
  const matchingFilter = [...filterButtons].find(
    (button) => button.dataset.filter === specialtyFromUrl,
  );
  if (matchingFilter) {
    filterButtons.forEach((button) => button.classList.remove("active"));
    matchingFilter.classList.add("active");
    filterDoctors();
  }
}

// Cada carrusel usa las flechas de su propio encabezado; el segundo arranca desfasado.
document.querySelectorAll(".topics-slider").forEach((topicsSlider, index) => {
  const topicsTrack = topicsSlider.querySelector(".topics-track");
  const controls = topicsSlider.previousElementSibling;
  if (!topicsTrack) return;
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

  controls?.querySelector(".topic-next")?.addEventListener("click", () => moveTopics(1));
  controls?.querySelector(".topic-prev")?.addEventListener("click", () => moveTopics(-1));

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let topicTimer;
    window.setTimeout(() => {
      topicTimer = window.setInterval(() => moveTopics(1), 3200);
    }, index * 1600);
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
});

const profile = document.querySelector("#doctorProfile");
if (profile) {
  const key = new URLSearchParams(location.search).get("doctor") || "carlos";
  let d = { name: document.querySelector("#profileName").textContent, wa: "Hola, deseo una cita" };
  const renderProfile = (doctors) => {
    d = doctors[key] || doctors.carlos;
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
    document.querySelector("#profileServices").replaceChildren(
      ...d.services.map((service) => Object.assign(document.createElement("span"), { textContent: service })),
    );
    document.querySelector("#profileWhatsapp").href = whatsappUrl(d.wa);
  };
  profile.classList.add("loading");
  fetch("data/doctors.json")
    .then((response) => response.json())
    .then(renderProfile)
    .catch(() => { document.querySelector("#profileWhatsapp").href = whatsappUrl(d.wa); })
    .finally(() => profile.classList.remove("loading"));

  document.querySelector("#profileBooking").addEventListener("click", () => {
    const field = (id) => document.querySelector(id).value.trim();
    const date = field("#profileDate");
    openWhatsApp(
      [
        d.wa,
        `Modalidad: ${field("#profileMode")}`,
        date && `Fecha preferida: ${date.split("-").reverse().join("/")}`,
        `Horario preferido: ${field("#profileTime")}`,
        field("#profilePatient") && `Nombre: ${field("#profilePatient")}`,
      ].filter(Boolean).join("\n"),
    );
  });
}
