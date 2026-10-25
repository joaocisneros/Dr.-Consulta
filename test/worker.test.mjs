import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker, { normalizeHistory, parseMaterials, materialsContext } from "../worker/index.mjs";

const realFetch = globalThis.fetch;
const env = { GEMINI_API_KEY: "test", SITE_URL: "https://sitio.test/" };
const context = { waitUntil() {} };
let geminiCalls;

beforeEach(() => {
  geminiCalls = [];
  globalThis.fetch = async (url, options) => {
    const href = String(url);
    if (href.includes("generativelanguage")) {
      geminiCalls.push({ url: href, body: JSON.parse(options.body) });
      return Response.json({ candidates: [{ content: { parts: [{ text: "Hola" }] } }] });
    }
    if (href.endsWith("data/doctors.json")) {
      return Response.json({ ana: { name: "Dra. Ana Torres", specialty: "Nutrición", license: "CNP 1", experience: "8 años", summary: "", bio: "", services: ["Plan"] } });
    }
    return new Response("<main><h1>Dr. Consulta</h1><script>x()</script></main>");
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const chat = (body, origin = "http://localhost:4317") => worker.fetch(new Request("https://api.test/api/chat", {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify(body),
}), env, context);

test("responde con el texto de Gemini e incluye los perfiles de los médicos", async () => {
  const response = await chat({ message: "¿Quién es nutricionista?" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: "Hola" });
  const system = geminiCalls[0].body.system_instruction.parts[0].text;
  assert.match(system, /Dra\. Ana Torres: Nutrición/);
  assert.doesNotMatch(system, /x\(\)/);
});

test("incluye la ficha del consultorio aunque falle otra página", async () => {
  globalThis.fetch = async (url, options) => {
    const href = String(url);
    if (href.includes("generativelanguage")) {
      geminiCalls.push({ body: JSON.parse(options.body) });
      return Response.json({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
    }
    if (href.endsWith("data/clinic.json")) return Response.json({ horario: "Lunes a sábado" });
    throw new Error("sin red");
  };
  await chat({ message: "¿Atienden sábados?" });
  const system = geminiCalls[0].body.system_instruction.parts[0].text;
  assert.match(system, /FICHA DEL CONSULTORIO:[\s\S]*Lunes a sábado/);
  assert.match(system, /SAMU 106/);
});

test("rechaza orígenes no permitidos", async () => {
  const response = await chat({ message: "hola" }, "https://otro.com");
  assert.equal(response.status, 403);
  assert.equal(geminiCalls.length, 0);
});

test("respeta el límite de peticiones", async () => {
  const limited = { ...env, CHAT_LIMITER: { limit: async () => ({ success: false }) } };
  const response = await worker.fetch(new Request("https://api.test/api/chat", {
    method: "POST", headers: { Origin: "http://localhost:4317" }, body: JSON.stringify({ message: "hola" }),
  }), limited, context);
  assert.equal(response.status, 429);
  assert.equal(geminiCalls.length, 0);
});

test("valida la longitud del mensaje", async () => {
  assert.equal((await chat({ message: "" })).status, 400);
  assert.equal((await chat({ message: "a".repeat(501) })).status, 400);
});

test("usa el modelo de respaldo cuando el principal devuelve 429", async () => {
  let first = true;
  globalThis.fetch = async (url, options) => {
    if (!String(url).includes("generativelanguage")) return new Response("");
    geminiCalls.push(String(url));
    if (first) { first = false; return Response.json({}, { status: 429 }); }
    return Response.json({ candidates: [{ content: { parts: [{ text: "Respaldo" }] } }] });
  };
  const response = await chat({ message: "hola" });
  assert.deepEqual(await response.json(), { answer: "Respaldo" });
  assert.match(geminiCalls[1], /gemini-3\.5-flash-lite/);
});

test("normaliza el historial a turnos alternados que empiezan por el usuario", () => {
  assert.deepEqual(normalizeHistory([
    { role: "model", text: "Bienvenida" },
    { role: "user", text: "a" },
    { role: "user", text: "b" },
    { role: "model", text: "c" },
    { role: "user", text: "sin respuesta" },
  ]), [
    { role: "user", parts: [{ text: "a\nb" }] },
    { role: "model", parts: [{ text: "c" }] },
  ]);
  assert.deepEqual(normalizeHistory("no es lista"), []);
});

const sampleMaterials = `window.DR_MATERIALES = {
  serums: [
    { titulo: "Salud pública", archivos: [
      { tipo: "pdf", nombre: "Guía", ruta: "materiales/serums/guia.pdf" },
    ] },
    { titulo: "Investigación", archivos: [] },
  ],
  residentado: [
    { titulo: "Pediatría", archivos: [] },
  ],
};
window.DR_PROPUESTAS = ["residentado"];`;

test("lee programas, módulos y archivos de materiales.js", () => {
  const subjects = parseMaterials(sampleMaterials);
  assert.deepEqual(subjects.map((s) => [s.key, s.number, s.titulo, s.files.length, s.proposal]), [
    ["serums", 1, "Salud pública", 1, false],
    ["serums", 2, "Investigación", 0, false],
    ["residentado", 1, "Pediatría", 0, true],
  ]);
});

test("incluye el texto de un material solo si la pregunta trata de su módulo", () => {
  const materials = { subjects: parseMaterials(sampleMaterials), texts: { "materiales/serums/guia.pdf": "Contenido de la guía" } };
  const related = materialsContext(materials, "¿Qué trae el material de Salud pública?");
  assert.match(related, /SERUMS · Módulo 1: Salud pública/);
  assert.match(related, /Residentado · Área 1: Pediatría .*propuesta/);
  assert.match(related, /Contenido de la guía/);
  assert.doesNotMatch(materialsContext(materials, "me duele la rodilla"), /Contenido de la guía/);
});
