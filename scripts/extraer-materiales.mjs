// Extrae el texto de los PDF y PPT listados en data/materiales.js y lo guarda en
// data/materiales-texto.json, para que Dr. Bot pueda responder sobre el contenido.
// Ejecutar después de agregar o cambiar materiales:  npm run materiales
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maxChars = 6000;

function loadMaterials() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "data", "materiales.js"), "utf8"), sandbox);
  return sandbox.window.DR_MATERIALES || {};
}

const clean = (text) => text.replace(/\s+/g, " ").trim();

async function pdfText(file) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return clean(pages.join("\n"));
}

// Un .pptx es un ZIP: se leen las diapositivas (ppt/slides/slideN.xml) desde el directorio central.
function pptxText(file) {
  const zip = fs.readFileSync(file);
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let offset = zip.readUInt32LE(end + 16);
  const slides = [];
  for (let i = 0, total = zip.readUInt16LE(end + 10); i < total; i++) {
    const method = zip.readUInt16LE(offset + 10);
    const size = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const local = zip.readUInt32LE(offset + 42);
    const name = zip.toString("utf8", offset + 46, offset + 46 + nameLength);
    const match = name.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (match) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      const xml = (method === 8 ? zlib.inflateRawSync(data) : data).toString("utf8");
      const text = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" ");
      slides.push([Number(match[1]), text]);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return clean(slides.sort((a, b) => a[0] - b[0]).map(([n, text]) => `Diapositiva ${n}: ${text}`).join("\n"));
}

const output = {};
for (const subjects of Object.values(loadMaterials())) {
  for (const file of subjects.flatMap((subject) => subject.archivos || [])) {
    const fullPath = path.join(root, file.ruta);
    if (!fs.existsSync(fullPath)) {
      console.warn(`No existe: ${file.ruta}`);
      continue;
    }
    const text = file.tipo === "pdf" ? await pdfText(fullPath) : pptxText(fullPath);
    output[file.ruta] = text.slice(0, maxChars);
    console.log(`${file.ruta}: ${text.length} caracteres`);
  }
}
fs.writeFileSync(path.join(root, "data", "materiales-texto.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Listo: ${Object.keys(output).length} archivos en data/materiales-texto.json`);
