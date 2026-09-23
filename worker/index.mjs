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

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function getSiteContext(context) {
  const cache = caches.default;
  const cacheKey = new Request("https://dr-consulta.internal/site-context");
  const cached = await cache.match(cacheKey);
  if (cached) return cached.text();
  const urls = [
    "https://joaocisneros.github.io/Dr.-Consulta/",
    "https://joaocisneros.github.io/Dr.-Consulta/nosotros.html",
  ];
  const pages = await Promise.all(urls.map(async (url) => {
    const response = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
    return response.ok ? htmlToText(await response.text()) : "";
  }));
  const siteText = pages.join("\n").slice(0, 14000);
  const cacheResponse = new Response(siteText, { headers: { "Cache-Control": "public, max-age=300" } });
  context.waitUntil(cache.put(cacheKey, cacheResponse));
  return siteText;
}

export default {
  async fetch(request, env, context) {
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

    const history = Array.isArray(body.history) ? body.history.slice(-8).flatMap((item) => {
      const role = item?.role === "model" ? "model" : "user";
      const text = String(item?.text || "").trim().slice(0, 500);
      return text ? [{ role, parts: [{ text }] }] : [];
    }) : [];
    const siteContext = await getSiteContext(context).catch(() => "");

    const system = `Eres Dr. Bot, asistente virtual de Dr. Consulta. Conversa naturalmente en español y responde de forma amable, profesional y breve: máximo 80 palabras. Usa texto plano, sin Markdown ni asteriscos. Responde preguntas sobre la clínica, sus médicos, especialidades, horarios, citas y contenido usando únicamente la información del sitio incluida al final. Si el dato no aparece, dilo claramente y ofrece contacto con el equipo. No diagnostiques ni prescribas medicamentos. Si detectas una posible emergencia, indica buscar atención de urgencias inmediatamente. Una respuesta no reemplaza una consulta médica.\n\nINFORMACIÓN ACTUAL DEL SITIO:\n${siteContext}`;
    try {
      const requestBody = JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [...history, { role: "user", parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 600, thinkingConfig: { thinkingLevel: "minimal" } },
      });
      const callGemini = (model) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: requestBody,
      });
      let response = await callGemini(env.GEMINI_MODEL || "gemini-3.6-flash");
      if (response.status === 429) response = await callGemini("gemini-3.5-flash-lite");
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
