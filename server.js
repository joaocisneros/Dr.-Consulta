const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
  }
}

const port = Number(process.env.PORT || 4317);
const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const mime = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp" };
const limits = new Map();

function json(res, status, data) {
  res.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "Access-Control-Allow-Origin":"*" });
  res.end(JSON.stringify(data));
}

async function chat(req, res) {
  const ip = req.socket.remoteAddress || "local";
  const now = Date.now();
  const recent = (limits.get(ip) || []).filter((time) => now - time < 60000);
  if (recent.length >= 12) return json(res, 429, { error:"Espera un momento antes de enviar otra consulta." });
  recent.push(now); limits.set(ip, recent);
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 8000) return json(res, 413, { error:"Mensaje demasiado extenso." });
  }
  let message;
  try { message = JSON.parse(raw).message?.trim(); } catch { return json(res, 400, { error:"Solicitud inválida." }); }
  if (!message || message.length > 500) return json(res, 400, { error:"Escribe una consulta breve." });
  if (!process.env.GEMINI_API_KEY) return json(res, 503, { error:"La API de Gemini todavía no está configurada en el servidor." });

  const system = `Eres Dr. Bot, asistente virtual de Dr. Consulta. Responde en español, de forma amable, profesional y muy breve: máximo 55 palabras. Usa frases cortas y texto plano, sin Markdown, asteriscos, títulos ni listas largas. La clínica atiende de lunes a viernes, de 8:00 a.m. a 7:00 p.m. Solo brindas orientación general y ayudas a elegir entre medicina familiar, medicina deportiva y nutrición clínica. No diagnostiques, no prescribas medicamentos y no inventes datos. Si hay dolor de pecho, dificultad para respirar, desmayo, sangrado intenso, riesgo de autolesión u otra posible emergencia, indica buscar servicios de emergencia inmediatamente. Recuerda que una respuesta no reemplaza una consulta médica.`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-goog-api-key":process.env.GEMINI_API_KEY },
      body:JSON.stringify({ system_instruction:{ parts:[{ text:system }] }, contents:[{ role:"user", parts:[{ text:message }] }], generationConfig:{ maxOutputTokens:600, thinkingConfig:{ thinkingLevel:"minimal" } } })
    });
    const data = await response.json();
    if (response.status === 429) return json(res, 429, { error:"Hay muchas consultas en este momento. Espera 30 segundos e inténtalo nuevamente." });
    if (!response.ok) {
      console.error("Gemini API:", response.status, data.error?.message || "Error desconocido");
      return json(res, 502, { error:"Gemini rechazó la solicitud. Revisa la clave, el modelo y la cuota." });
    }
    const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!answer) return json(res, 502, { error:"Gemini no devolvió una respuesta." });
    return json(res, 200, { answer });
  } catch {
    return json(res, 502, { error:"No se pudo contactar con Gemini." });
  }
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS" && req.url === "/api/chat") {
    res.writeHead(204, { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type" });
    return res.end();
  }
  if (req.method === "POST" && req.url === "/api/chat") return chat(req, res);
  const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root) || /(^|[\\/])(\.env|\.git|server\.js|package\.json)/.test(file)) { res.writeHead(404); return res.end("No encontrado"); }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type":mime[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(content);
  });
}).listen(port, () => console.log(`Dr. Consulta disponible en http://localhost:${port}`));
