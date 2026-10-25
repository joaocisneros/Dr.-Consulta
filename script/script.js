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

// El formulario llega al correo de la clínica mediante FormSubmit (sin servidor propio).
// Se usa el código privado de FormSubmit para no exponer el correo en el código.
// FormSubmit rechaza los archivos locales, así que en la PC se envía a través de server.js (npm start).
const formSubmitId = "0adf275317fcfc20be190ef22b6a1d42";
const isLocalPage = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
// En Vercel (o un dominio propio) el chat pasa por la misma dirección de la página (vercel.json lo
// reenvía al Worker), así los bloqueadores del navegador no lo cortan. GitHub Pages no reenvía.
// El formulario va siempre directo a FormSubmit: rechaza los envíos reenviados desde servidores.
const sameSiteApi = !isLocalPage && !location.hostname.endsWith("github.io");
const contactUrl = isLocalPage
  ? "http://localhost:4317/api/contact"
  : `https://formsubmit.co/ajax/${formSubmitId}`;
const form = document.querySelector("#contactForm");
if (form)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const field = (key) => String(data.get(key) || "").trim();
    if (field("_honey")) return;
    const name = field("name");
    const status = form.querySelector(".form-status");
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    status.textContent = "Enviando…";
    try {
      const response = await fetch(contactUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          Nombre: name,
          Teléfono: field("phone"),
          Correo: field("email"),
          Mensaje: field("message") || "(sin mensaje)",
          _subject: `Nueva solicitud de ${name} - Dr. Consulta`,
          _replyto: field("email"),
          _template: "table",
        }),
      });
      const result = await response.json();
      if (!response.ok || String(result.success) !== "true") throw new Error(result.message);
      status.textContent = `¡Mensaje enviado correctamente, ${name.split(" ")[0]}! Le responderemos pronto.`;
      form.reset();
    } catch (error) {
      // El detalle técnico queda solo en la consola, nunca a la vista del paciente.
      console.error("FormSubmit:", error.message);
      status.innerHTML = "";
      status.append(
        "En este momento no pudimos enviar su mensaje. Escríbanos por ",
        Object.assign(document.createElement("a"), {
          href: whatsappUrl(`Hola, soy ${name}. Deseo orientación de Dr. Consulta.`),
          target: "_blank",
          rel: "noopener",
          textContent: "WhatsApp",
        }),
        ".",
      );
    } finally {
      button.disabled = false;
    }
  });

// Mientras no exista el sistema de citas, la reserva rápida le pregunta a Dr. Bot con lo que eligió el paciente.
const bookingSubmit = document.querySelector(".booking-submit");
if (bookingSubmit) {
  const bookingBar = bookingSubmit.closest(".booking-bar");
  const specialtySelect = bookingBar.querySelector("[name=specialty]");
  const doctorSelect = bookingBar.querySelector("[name=doctor]");
  const doctorSpecialty = {
    "Dr. Carlos Mendoza": "Medicina deportiva",
    "Dra. Ana Torres": "Nutrición clínica",
    "Dr. Luis Ramírez": "Medicina familiar",
  };
  // Al elegir un doctor se completa su especialidad; al elegir especialidad solo quedan sus doctores.
  doctorSelect.addEventListener("change", () => {
    if (doctorSelect.selectedIndex > 0) specialtySelect.value = doctorSpecialty[doctorSelect.value];
    specialtySelect.setCustomValidity("");
  });
  specialtySelect.addEventListener("change", () => {
    specialtySelect.setCustomValidity("");
    [...doctorSelect.options].slice(1).forEach((option) => {
      option.hidden = specialtySelect.selectedIndex > 0 && doctorSpecialty[option.value] !== specialtySelect.value;
    });
    if (doctorSelect.selectedOptions[0]?.hidden) doctorSelect.selectedIndex = 0;
  });
  bookingSubmit.addEventListener("click", () => {
    const [specialty, doctor, mode] = [...bookingBar.querySelectorAll("select")].map(
      (select) => (select.selectedIndex > 0 || select.name === "mode" ? select.value : ""),
    );
    if (!specialty && !doctor) {
      specialtySelect.setCustomValidity("Seleccione una especialidad o un profesional.");
      specialtySelect.reportValidity();
      return;
    }
    const request = [
      "Quisiera reservar una cita",
      specialty && `de ${specialty}`,
      doctor && `con ${doctor === "Dra. Ana Torres" ? "la" : "el"} ${doctor}`,
      `en modalidad ${mode.toLowerCase()}`,
    ].filter(Boolean).join(" ");
    window.askDrBot?.(`${request}. ¿Qué horarios tienen disponibles?`);
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
  }
  // Detecta cuando el paciente pide ir a WhatsApp ("llévame al wasap", "pásame al wsp", "quiero hablar por WhatsApp").
  // Una pregunta como "¿tienen WhatsApp?" la responde la IA.
  const whatsappWord = /whats?\s?app|g?u?w?asap|wats|wsp|wpp|whats/i;
  const goVerb = /ll[eé]v|p[aá]s|abr|ir\b|vamos|conect|comunic|habl|escrib|contact|deriv|redirig|m[aá]nd|quiero|deseo|prefiero/i;
  const wantsWhatsApp = (text) =>
    whatsappWord.test(text) && !/^\s*¿|\?\s*$/.test(text) && (goVerb.test(text) || text.trim().split(/\s+/).length <= 3);
  // Resume la consulta previa del paciente para que el equipo tenga contexto al abrir WhatsApp.
  const whatsappGreeting = () => {
    const previous = chatHistory.filter((m) => m.type === "user" && !wantsWhatsApp(m.text)).slice(-2).map((m) => m.text);
    return previous.length
      ? `Hola, vengo del chat de la página de Dr. Consulta. Mi consulta: ${previous.join(" / ")}`
      : "Hola, vengo del chat de la página de Dr. Consulta y deseo información.";
  };
  // En las respuestas del bot, el número de WhatsApp es un enlace: al hacer clic se abre el chat de la clínica.
  const whatsappNumberPattern = /^(?:\+?51\s?)?910\s?038\s?666$/;
  const addMessage = (text, type, persist = true) => {
    const item = document.createElement("div");
    item.className = `chat-message ${type}`;
    const clean = String(text)
      .replace(/\*\*/g, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^\s*[-•]\s+/gm, "• ")
      .trim();
    if (type === "bot") {
      clean.split(/((?:\+?51\s?)?910\s?038\s?666)/).forEach((part) => {
        if (!whatsappNumberPattern.test(part)) return item.append(part);
        item.append(Object.assign(document.createElement("a"), {
          className: "chat-wa-number",
          href: whatsappUrl(whatsappGreeting()),
          target: "_blank",
          rel: "noopener",
          textContent: part,
        }));
      });
    } else {
      item.textContent = clean;
    }
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    if (persist) {
      chatHistory.push({ text: clean, type });
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
  const askGemini = async (text) => {
    if (chatBusy) return;
    chatBusy = true;
    chatInput.disabled = true;
    medicalChat.querySelectorAll(".chat-form button").forEach((button) => { button.disabled = true; });
    const waiting = document.createElement("div");
    waiting.className = "chat-message bot chat-waiting";
    waiting.textContent = "Pensando…";
    messages.appendChild(waiting);
    messages.scrollTop = messages.scrollHeight;
    try {
      const productionApi = "https://dr-consulta-api.dr-consulta.workers.dev/api/chat";
      const apiUrl = location.port === "4317" || sameSiteApi
        ? "/api/chat"
        : isLocalPage
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
      // Si el paciente pidió WhatsApp y la IA no dio el número, se añade para que siempre pueda hacer clic.
      const needsNumber = wantsWhatsApp(text) && !/910\s?038\s?666/.test(data.answer || "");
      if (response.ok && data.answer) addMessage(needsNumber ? `${data.answer} Puede escribirnos por WhatsApp al +51 910 038 666.` : data.answer, "bot");
      else addMessage(data.error || "No pude responder en este momento. Puede escribirnos por WhatsApp al +51 910 038 666.", "bot", false);
    } catch {
      waiting.remove();
      addMessage("El asistente no está disponible en este momento. Puede escribirnos por WhatsApp al +51 910 038 666.", "bot", false);
    } finally {
      chatBusy = false;
      chatInput.disabled = false;
      medicalChat.querySelectorAll(".chat-form button").forEach((button) => { button.disabled = false; });
      chatInput.focus();
    }
  };
  // Permite que otras partes de la página (como la reserva rápida) abran el chat con una consulta.
  window.askDrBot = (text) => {
    toggleChat(true);
    if (chatBusy) return;
    addMessage(text, "user");
    askGemini(text);
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

// Modal de Formación médica: se abre al hacer clic en cada tarjeta (también en las copias del carrusel).
const educationTopics = {
  serums: {
    kicker: "Preparación",
    unit: ["Módulo", "Módulos"],
    title: "SERUMS",
    image: "img/formacion-serums.webp?v=3",
    text: "Acompañamiento para profesionales de la salud que se preparan para el Servicio Rural y Urbano Marginal de Salud y para atender en comunidades de la costa, la sierra y la selva.",
    points: ["Orientación sobre el proceso y los requisitos", "Repaso de temas clave de atención primaria", "Casos prácticos de atención en zonas rurales"],
    wa: "Hola, deseo información sobre la preparación para el SERUMS",
  },
  emergencia: {
    kicker: "Urgencias",
    unit: ["Taller", "Talleres"],
    title: "Emergencia",
    image: "img/formacion-emergencia.webp?v=2",
    text: "Formación en la atención inicial de pacientes en situaciones de urgencia y emergencia.",
    points: ["Evaluación inicial y priorización del paciente", "Manejo de las emergencias más frecuentes", "Casos clínicos para la toma de decisiones"],
    wa: "Hola, deseo información sobre los temas de Emergencia",
  },
  residentado: {
    kicker: "Examen",
    unit: ["Área", "Áreas"],
    title: "Residentado",
    image: "img/formacion-residentado.webp?v=2",
    text: "Preparación para el examen de Residentado Médico, con un repaso ordenado de las áreas más evaluadas.",
    points: ["Repaso por especialidades y áreas clave", "Práctica con preguntas tipo examen", "Estrategias de estudio y organización del tiempo"],
    wa: "Hola, deseo información sobre la preparación para el Residentado",
  },
  temas: {
    kicker: "Actualización",
    unit: ["Curso", "Cursos"],
    title: "Temas médicos",
    image: "img/formacion-temas-medicos.webp?v=2",
    text: "Contenido de actualización en ciencias básicas y clínicas para estudiantes y profesionales de la salud.",
    points: ["Anatomía, Fisiología y Farmacología", "Patología y Medicina Interna", "Material de repaso para consulta permanente"],
    wa: "Hola, deseo información sobre los temas médicos",
  },
  educativa: {
    kicker: "Clases con docentes especialistas",
    title: "Medicina educativa",
    image: "img/formacion-medicina-educativa.webp?v=2",
    soon: true,
    text: "Estamos preparando clases con docentes especialistas. Escríbanos y le avisaremos en cuanto se abran las inscripciones.",
    points: ["Clases con docentes especialistas", "Contenido organizado por áreas de la medicina"],
    wa: "Hola, deseo que me avisen cuando se lance Medicina educativa",
  },
};
const firstEducationCard = document.querySelector(".edu-card[data-topic]");
if (firstEducationCard) {
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="edu-modal" aria-labelledby="eduModalTitle">
      <button class="edu-modal-close" type="button" aria-label="Cerrar">×</button>
      <div class="edu-modal-grid">
        <div class="edu-modal-main">
          <img class="edu-modal-image" alt="" />
          <div class="edu-modal-body">
            <span class="kicker edu-modal-kicker"></span><b class="soon-badge edu-modal-soon">Muy pronto</b>
            <h2 id="eduModalTitle"></h2>
            <p class="edu-modal-text"></p>
            <ul class="edu-modal-points"></ul>
            <div class="edu-modal-actions">
              <a class="btn primary edu-modal-wa" target="_blank" rel="noopener"></a>
              <button class="btn outline edu-modal-bot" type="button">Preguntar a Dr. Bot</button>
            </div>
          </div>
        </div>
        <section class="edu-materials">
          <h3 class="edu-materials-title"></h3>
          <ol class="edu-materials-list"></ol>
        </section>
      </div>
    </dialog>
    <dialog class="doc-viewer" aria-labelledby="docViewerTitle">
      <header class="doc-viewer-header">
        <b id="docViewerTitle"></b>
        <a class="doc-viewer-download" download>Descargar</a>
        <button class="doc-viewer-close" type="button" aria-label="Cerrar">×</button>
      </header>
      <iframe class="doc-viewer-frame" title="Material de estudio"></iframe>
    </dialog>`);
  const modal = document.querySelector(".edu-modal");
  const viewer = document.querySelector(".doc-viewer");
  const viewerFrame = viewer.querySelector(".doc-viewer-frame");
  let currentTopic;

  // Los PDF se ven con el lector del navegador; los PPT con el visor de Microsoft, que solo
  // funciona en la página publicada. Donde no se pueda mostrar, el archivo se abre o se descarga.
  const isPublished = location.protocol === "https:" && !["localhost", "127.0.0.1"].includes(location.hostname);
  const openMaterial = (file) => {
    const url = new URL(file.ruta, location.href).href;
    const canShow = file.tipo === "pdf" ? navigator.pdfViewerEnabled !== false : isPublished;
    if (!canShow) return window.open(url, "_blank", "noopener");
    viewer.querySelector("#docViewerTitle").textContent = file.nombre;
    viewer.querySelector(".doc-viewer-download").href = url;
    viewerFrame.src = file.tipo === "pdf"
      ? url
      : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    viewer.showModal();
  };
  const closeViewer = () => {
    viewer.close();
    viewerFrame.src = "about:blank";
  };
  viewer.querySelector(".doc-viewer-close").addEventListener("click", closeViewer);
  viewer.addEventListener("close", () => { viewerFrame.src = "about:blank"; });

  // Cada programa nombra sus partes: "Módulo" en SERUMS, Residentado y Emergencia; "Clase" en los cursos.
  const renderMaterials = (key) => {
    const subjects = window.DR_MATERIALES?.[key] || [];
    const [unit, units] = educationTopics[key].unit || ["Módulo", "Módulos"];
    const materialsTitle = modal.querySelector(".edu-materials-title");
    materialsTitle.textContent = `${units} y materiales`;
    if (window.DR_PROPUESTAS?.includes(key)) {
      materialsTitle.append(Object.assign(document.createElement("b"), { className: "edu-proposal", textContent: "Propuesta" }));
    }
    modal.querySelector(".edu-materials").hidden = !subjects.length;
    modal.classList.toggle("with-materials", subjects.length > 0);
    modal.querySelector(".edu-materials-list").replaceChildren(...subjects.map((subject) => {
      const item = document.createElement("li");
      const files = document.createElement("div");
      files.className = "edu-material-files";
      if (!subject.archivos?.length) {
        files.append(Object.assign(document.createElement("small"), { textContent: "Material próximamente" }));
      }
      subject.archivos?.forEach((file) => {
        files.append(Object.assign(document.createElement("button"), {
          type: "button",
          className: `edu-material-file ${file.tipo}`,
          textContent: `${file.tipo === "pdf" ? "📄" : "📊"} ${file.nombre}`,
          onclick: () => openMaterial(file),
        }));
      });
      const title = Object.assign(document.createElement("span"), { textContent: subject.titulo });
      title.dataset.unit = unit;
      item.append(title, files);
      return item;
    }));
  };
  const openTopic = (key) => {
    const topic = educationTopics[key];
    if (!topic) return;
    currentTopic = topic;
    modal.querySelector(".edu-modal-image").src = topic.image;
    modal.querySelector(".edu-modal-image").alt = topic.title;
    modal.querySelector(".edu-modal-kicker").textContent = topic.kicker;
    modal.querySelector(".edu-modal-soon").hidden = !topic.soon;
    modal.querySelector("h2").textContent = topic.title;
    modal.querySelector(".edu-modal-text").textContent = topic.text;
    modal.querySelector(".edu-modal-points").replaceChildren(
      ...topic.points.map((point) => Object.assign(document.createElement("li"), { textContent: point })),
    );
    const wa = modal.querySelector(".edu-modal-wa");
    wa.href = whatsappUrl(topic.wa);
    wa.textContent = topic.soon ? "Avisarme por WhatsApp" : "Más información por WhatsApp";
    renderMaterials(key);
    modal.showModal();
    modal.scrollTop = 0;
  };
  document.addEventListener("click", (event) => {
    const card = event.target.closest(".edu-card[data-topic]");
    if (!card) return;
    event.preventDefault();
    openTopic(card.dataset.topic);
  });
  document.addEventListener("keydown", (event) => {
    const card = event.target.closest?.(".edu-card[data-topic][role=button]");
    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openTopic(card.dataset.topic);
    }
  });
  modal.querySelector(".edu-modal-close").addEventListener("click", () => modal.close());
  // Clic fuera del contenido (en el fondo oscuro) cierra el modal.
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
  modal.querySelector(".edu-modal-bot").addEventListener("click", () => {
    modal.close();
    window.askDrBot?.(`Quisiera información sobre ${currentTopic.title}.`);
  });
}
