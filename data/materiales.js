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
  emergencia: [],
  residentado: [],
  temas: [],
};
