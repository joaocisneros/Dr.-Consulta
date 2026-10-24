const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const root = __dirname;
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
  }
}

const port = Number(process.env.PORT || 4317);
const mime = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".svg":"image/svg+xml", ".ico":"image/x-icon", ".pdf":"application/pdf", ".ppt":"application/vnd.ms-powerpoint", ".pptx":"application/vnd.openxmlformats-officedocument.presentationml.presentation" };
const publicFolders = new Set(["img", "data", "script", "styles", "materiales"]);
const limits = new Map();
// El chat local usa el mismo código que el Worker publicado en Cloudflare.
const worker = import(pathToFileURL(path.join(root, "worker", "index.mjs")).href).then((module) => module.default);
const workerEnv = { ...process.env, SITE_URL: `http://localhost:${port}/` };

async function callWorker(req, res, body) {
  // Las páginas abiertas con doble clic (file://) envían Origin "null"; solo se acepta en este servidor local.
  const fromFile = req.headers.origin === "null";
  const origin = fromFile ? "http://localhost:4317" : req.headers.origin || "";
  const headers = { "Origin":origin, "Content-Type":req.headers["content-type"] || "application/json" };
  const request = new Request(`http://localhost:${port}${req.url}`, { method:req.method, headers, body });
  const response = await (await worker).fetch(request, workerEnv, { waitUntil() {} });
  const responseHeaders = Object.fromEntries(response.headers);
  if (fromFile) responseHeaders["access-control-allow-origin"] = "null";
  res.writeHead(response.status, responseHeaders);
  res.end(await response.text());
}

async function chat(req, res) {
  if (req.method === "OPTIONS") return callWorker(req, res);
  const ip = req.socket.remoteAddress || "local";
  const now = Date.now();
  const recent = (limits.get(ip) || []).filter((time) => now - time < 60000);
  if (recent.length >= 12) {
    res.writeHead(429, { "Content-Type":"application/json; charset=utf-8" });
    return res.end(JSON.stringify({ error:"Espera un momento antes de enviar otra consulta." }));
  }
  recent.push(now); limits.set(ip, recent);
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 8000) {
      res.writeHead(413, { "Content-Type":"application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error:"Mensaje demasiado extenso." }));
    }
  }
  return callWorker(req, res, raw);
}

// FormSubmit rechaza envíos desde archivos locales; el servidor los reenvía como la página publicada.
const formSubmitId = process.env.FORMSUBMIT_ID || "0adf275317fcfc20be190ef22b6a1d42";
const publishedSite = "https://joaocisneros.github.io/Dr.-Consulta/";
async function contact(req, res) {
  const cors = { "Access-Control-Allow-Origin":req.headers.origin || "*", "Access-Control-Allow-Methods":"POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type, Accept" };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 8000) { res.writeHead(413, cors); return res.end(); }
  }
  const response = await fetch(`https://formsubmit.co/ajax/${formSubmitId}`, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Accept":"application/json", "Origin":new URL(publishedSite).origin, "Referer":publishedSite },
    body:raw,
  });
  res.writeHead(response.status, { ...cors, "Content-Type":"application/json; charset=utf-8" });
  res.end(await response.text());
}

function isPublic(relative) {
  const parts = relative.split(/[\\/]/);
  return parts.length === 1 ? /\.html$/.test(relative) : publicFolders.has(parts[0]);
}

http.createServer(async (req, res) => {
  if (req.url === "/api/chat" && (req.method === "POST" || req.method === "OPTIONS")) {
    return chat(req, res).catch(() => { res.writeHead(500); res.end(); });
  }
  if (req.url === "/api/contact" && (req.method === "POST" || req.method === "OPTIONS")) {
    return contact(req, res).catch(() => { res.writeHead(502); res.end(); });
  }
  let requestPath;
  try { requestPath = decodeURIComponent((req.url || "/").split("?")[0]); } catch { res.writeHead(400); return res.end(); }
  const file = path.resolve(root, requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, ""));
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !isPublic(relative)) { res.writeHead(404); return res.end("No encontrado"); }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type":mime[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(content);
  });
}).listen(port, () => console.log(`Dr. Consulta disponible en http://localhost:${port}`));
