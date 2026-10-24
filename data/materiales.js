// Módulos (o clases) y materiales que se muestran dentro de cada tarjeta de Formación médica.
//
// Para agregar un material:
//   1. Copia el archivo (PDF o PPT) en la carpeta materiales/<tema>/, por ejemplo materiales/serums/
//   2. Añádelo en "archivos" del módulo correspondiente:
//        { tipo: "pdf", nombre: "Guía de estudio", ruta: "materiales/serums/guia.pdf" }
//      tipo puede ser "pdf" o "ppt" (para .ppt y .pptx).
//   3. Si un módulo no tiene archivos, se muestra como "Material próximamente".
//
// Los archivos de GitHub Pages son públicos: cualquiera con el enlace puede descargarlos.
window.DR_MATERIALES = {
  serums: [
    {
      titulo: "Salud pública",
      archivos: [
        // Muestra para ver cómo funciona; reemplazar por el material real.
        { tipo: "pdf", nombre: "Material de ejemplo (PDF)", ruta: "materiales/serums/ejemplo-modulo-1.pdf" },
        { tipo: "ppt", nombre: "Presentación de ejemplo (PPT)", ruta: "materiales/serums/ejemplo-modulo-1.pptx" },
      ],
    },
    { titulo: "Ética e interculturalidad", archivos: [] },
    { titulo: "Cuidado integral de salud", archivos: [] },
    { titulo: "Investigación", archivos: [] },
    { titulo: "Gestión en Salud", archivos: [] },
    { titulo: "Resolución de simulacros", archivos: [] },
  ],
  // Propuestas pendientes de confirmar con el cliente (se muestran con la etiqueta "Propuesta").
  emergencia: [
    { titulo: "Soporte vital básico y RCP", archivos: [] },
    { titulo: "Atención inicial del trauma", archivos: [] },
    { titulo: "Urgencias pediátricas", archivos: [] },
    { titulo: "Emergencias obstétricas", archivos: [] },
  ],
  residentado: [
    { titulo: "Medicina Interna", archivos: [] },
    { titulo: "Pediatría", archivos: [] },
    { titulo: "Ginecología y Obstetricia", archivos: [] },
    { titulo: "Cirugía General", archivos: [] },
    { titulo: "Salud Pública", archivos: [] },
    { titulo: "Simulacros de examen", archivos: [] },
  ],
  temas: [
    { titulo: "Anatomía", archivos: [] },
    { titulo: "Fisiología", archivos: [] },
    { titulo: "Farmacología", archivos: [] },
    { titulo: "Patología", archivos: [] },
    { titulo: "Medicina Interna", archivos: [] },
  ],
};

// Secciones cuya organización aún es una propuesta. Quitar cada una cuando el cliente la confirme.
window.DR_PROPUESTAS = ["emergencia", "residentado", "temas"];
