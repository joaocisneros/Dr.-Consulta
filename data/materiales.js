// Temas y materiales que se muestran dentro de cada tarjeta de Formación médica.
//
// Para agregar un material:
//   1. Copia el archivo (PDF o PPT) en la carpeta materiales/<tema>/, por ejemplo materiales/serums/
//   2. Añádelo en "archivos" del tema correspondiente:
//        { tipo: "pdf", nombre: "Guía de estudio", ruta: "materiales/serums/guia.pdf" }
//      tipo puede ser "pdf" o "ppt" (para .ppt y .pptx).
//   3. Si un tema no tiene archivos, se muestra como "Material próximamente".
//
// Los archivos de GitHub Pages son públicos: cualquiera con el enlace puede descargarlos.
window.DR_MATERIALES = {
  serums: [
    {
      titulo: "Normativa y proceso del SERUMS",
      archivos: [
        // Muestra para ver cómo funciona; reemplazar por el material real.
        { tipo: "pdf", nombre: "Material de ejemplo (PDF)", ruta: "materiales/serums/ejemplo-tema-1.pdf" },
      ],
    },
    { titulo: "Atención primaria de salud", archivos: [] },
    { titulo: "Salud materno-infantil", archivos: [] },
    { titulo: "Enfermedades transmisibles y vigilancia", archivos: [] },
  ],
  emergencia: [],
  residentado: [],
  temas: [],
};
