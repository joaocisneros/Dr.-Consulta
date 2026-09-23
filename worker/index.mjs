const allowedOrigins = new Set([
  "https://joaocisneros.github.io",
  "http://localhost:4317",
  "http://127.0.0.1:4317",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://joaocisneros.github.io",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (url.pathname === "/health") return json({ ok: true }, 200, origin);
    if (url.pathname !== "/api/chat" || request.method !== "POST") return json({ error: "No encontrado." }, 404, origin);
    if (!allowedOrigins.has(origin)) return json({ error: "Origen no permitido." }, 403, origin);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Solicitud inválida." }, 400, origin); }
    const message = String(body?.message || "").trim();
    if (!message || message.length > 500) return json({ error: "Escribe una consulta breve." }, 400, origin);
    if (!env.GEMINI_API_KEY) return json({ error: "Gemini no está configurado." }, 503, origin);

    const system = `Eres Dr. Bot, asistente virtual de Dr. Consulta. Responde en español, de forma amable, profesional y muy breve: máximo 55 palabras. Usa frases cortas y texto plano, sin Markdown, asteriscos, títulos ni listas largas. La clínica atiende de lunes a viernes, de 8:00 a.m. a 7:00 p.m. Solo brindas orientación general y ayudas a elegir entre medicina familiar, medicina deportiva y nutrición clínica. No diagnostiques, no prescribas medicamentos y no inventes datos. Si hay dolor de pecho, dificultad para respirar, desmayo, sangrado intenso, riesgo de autolesión u otra posible emergencia, indica buscar servicios de emergencia inmediatamente. Recuerda que una respuesta no reemplaza una consulta médica.`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL || "gemini-3.6-flash"}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 600, thinkingConfig: { thinkingLevel: "minimal" } },
        }),
      });
      const data = await response.json();
      if (response.status === 429) return json({ error: "Hay muchas consultas en este momento. Espera 30 segundos e inténtalo nuevamente." }, 429, origin);
      if (!response.ok) return json({ error: "El asistente no pudo responder en este momento." }, 502, origin);
      const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
      return answer ? json({ answer }, 200, origin) : json({ error: "Gemini no devolvió una respuesta." }, 502, origin);
    } catch {
      return json({ error: "No se pudo contactar con Gemini." }, 502, origin);
    }
  },
};
