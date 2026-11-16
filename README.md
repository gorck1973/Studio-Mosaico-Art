# 🎨 Studio Mosaico Art

**Editor de imágenes para pixel art físico: convierte cualquier fotografía o ilustración en una plantilla con cuadrícula, coordenadas exactas, conteo de piezas y proporciones de mezcla para murales de madera, mosaicos, Hama/Perler beads y bricolaje.**

🔗 **[Probar la aplicación en vivo aquí](https://gorck1973.github.io/Studio-Mosaico-Art/)**

![Vista previa de Studio Mosaico Art](public/preview.png)

## ✨ ¿Para qué sirve?
A diferencia de los editores de pixel art pensados solo para pantalla, **Studio Mosaico Art** está diseñado como herramienta de taller para llevar diseños digitales al mundo real (murales con cubos de madera, mosaicos cerámicos, teselas, crochet o pixel art con cuentas), entregando medidas físicas reales, cantidades exactas por tono y mapas listos para imprimir.

## 🛠️ Características principales

- **Cuadrícula libre y calculadora física (`cm` / `pulg`):**
  - Define libremente **Ancho × Alto** (desde `4 × 4` hasta `40 × 50`) o usa tamaños preconfigurados opcionales.
  - Configura el tamaño de cada bloque físico en **centímetros (`cm`) o pulgadas (`pulg`)** mediante lista rápida o entrada libre; el tamaño final del mural y de cada pieza se muestra siempre en **`cm`** para evitar errores en el taller.
- **Lectura inteligente en Color y Escala de Grises:**
  - Detecta automáticamente si la imagen cargada es a color o blanco y negro.
  - Incluye **Lectura Inteligente (Color Real)** mediante agrupamiento perceptual en espacio **CIE Lab**, además de **Reemplazar Negro**, **Degradado 2 Colores**, **Degradado 3 Colores** y **Colores Puros**.
  - Ajustes en tiempo real de contraste, brillo, gamma, zoom/encuadre, inversión de tonos y tramado suave.
  - Comparación visual **Desarrollo**, **Lado a lado** y **Cortina interactiva**.
- **Editor de cuadrícula integrado y limpieza de paleta:**
  - Herramientas prácticas sobre la cuadrícula: **Pintar**, **Relleno** (bote de pintura por área), **Cuentagotas**, **Borrar** (al tono de fondo), **Restaurar** celda original, **Deshacer** paso a paso y **Revertir todo**.
  - Permite agregar colores personalizados, editar tonos existentes, eliminar tonos redundantes y usar **Limpiar sin uso** para quitar en un clic los tonos con `0` píxeles y renumerar la paleta limpia (`01–N`).
- **Tabla de taller y coordenadas:**
  - Calcula código de tono, muestra y código `HEX`, proporción de mezcla (ej. `90/10`) o valores `RGB`, cantidad exacta de piezas, `%` de área y coordenadas en formato **`A/1`** o **`C01-F01`**.
- **Vistas especializadas de ensamblaje:**
  - **Imagen y Cuadrícula:** Vista principal con rejilla, códigos superpuestos y conteo rápido por tono.
  - **Capas en Negro:** Aísla cada tono en blanco y negro para pintar o clasificar bloques por lotes sin confusiones.
  - **Matriz de Códigos:** Mapa técnico limpio ideal para imprimir y consultar durante el armado.
- **Exportación lista para imprimir y proyectos guardables:**
  - Exporta a **PDF** multipágina (plantilla visual + tabla de conteos y coordenadas), **PNG** de alta resolución, **CSV** (hoja de cálculo) o copia la guía completa al portapapeles.
  - Guarda y reabre tu trabajo completo (imagen, ajustes, paleta personalizada y retoques manuales) en archivos **`.mosaico.json`**, con autoguardado automático en el navegador.

## 🚀 Cómo usarla en tus proyectos físicos

1. **Sube una imagen:** Arrastra o carga tu foto o ilustración (la app detecta automáticamente si es a color o escala de grises).
2. **Ajusta cuadrícula y medida física:** Indica las columnas/filas según las piezas disponibles y selecciona el tamaño de tu cubo o tesela (`cm` o `pulg`) para conocer la medida final en `cm`.
3. **Optimiza luz, gama y edita detalles:** Ajusta contraste/brillo, define el número de tonos y usa **Editar cuadrícula** (pintar, relleno, cuentagotas o limpiar tonos sin uso) para perfeccionar tu diseño.
4. **Prepara materiales y ensambla:** Consulta la tabla de conteos/proporciones y descarga el **PDF**, **PNG** o **CSV** para armar tu mural coordenada por coordenada.

## 💻 Desarrollo local

```bash
git clone https://github.com/gorck1973/Studio-Mosaico-Art.git
cd Studio-Mosaico-Art
npm install
npm run dev
```

Para generar la compilación de producción:

```bash
npm run build
```

## 🔒 Privacidad y tecnologías
- **100% en el navegador:** Todo el procesamiento de imagen, cálculo de paleta y exportación se realiza localmente mediante HTML5 Canvas; tus imágenes nunca se suben a servidores externos.
- **Stack:** React + TypeScript · Vite · Tailwind CSS · Lucide Icons.

---
© 2026. Desarrollo Web e IA por [GORCK](https://github.com/gorck1973).
