---
name: salir
description: Al terminar el evento, quita la oficina y todo lo que se instaló en esta laptop para el equipo, sin dejar basura. Uso: /salir
---

1. Corre `node scripts/limpiar.mjs --todo` y muestra lo que quitó: el plugin de la oficina, su marketplace, la caché, los índices, sus datos y `CLAUDE.local.md`.
2. Si se instalaron skills con `npx skills add` dentro de esta carpeta, quítalas (`npx skills remove <nombre>`) y dilo. No toques nada fuera de esta carpeta salvo lo que hace el script.
3. Pregunta si también quiere borrar la carpeta del repo de su Escritorio. No la borres desde esta sesión (está abierta dentro de ella): dile que cierre la sesión y la borre desde el Explorador de archivos, o que abra una sesión en el Escritorio y te lo pida ahí. Avisa que borrarla no se puede deshacer.
4. Termina con: puede cerrar su sesión de Claude desde el menú de su cuenta si quiere, y el coordinador lo quitará del repo.
