---
name: revisar
description: (Solo coordinador) Revisa las entregas en lista-para-revision; si cumplen, las une a main y las marca hechas, y si no, pide cambios en la tarea. Para que sea automático, /loop 5m /revisar. Uso: /revisar
---

Solo lo corre el coordinador (mira `CLAUDE.local.md`). Sé breve: una línea por entrega.

1. `git checkout main`, `git pull` y `git fetch --prune`. Busca en las ramas `origin/integrante-*/*` las tareas con `estado: lista-para-revision`. Si no hay ninguna, di "Nada por revisar" y termina.
2. Por cada entrega, revisa `git diff main...<rama>` y la tarea:
   - Todas las casillas de "Listo cuando" en `[x]` y lo prometido existe de verdad (abre los archivos).
   - Solo toca su área ("Archivos/área") y la tarea; nada de claves, tokens, `.env` ni archivos enormes.
   - Si el repo tiene pruebas o un build, córrelos. Si está instalado el plugin `code-review`, úsalo para una revisión rápida.
3. **Si cumple:** `git merge --no-ff <rama>` en `main`. En la tarea cambia el estado a `estado: hecha` y agrega `revisado: <fecha y hora ISO>`. Haz commit y push a `main` (la oficina festeja y el tablero lo pasa a Hechas).
4. **Si no cumple:** no unas nada. En la rama del integrante (`git checkout <rama>`) cambia la tarea a `estado: cambios-pedidos` y agrega `## Cambios pedidos` con 2 a 4 puntos concretos. Haz commit y push a esa rama y vuelve a `main`. Su "haz mis tareas" lo verá primero.
5. Si al unir hay conflictos: resuélvelos solo si son triviales (por ejemplo, el mismo archivo de tarea); si no, aborta el merge y pide cambios ("actualiza tu rama con main").
6. Termina con un resumen: unidas, con cambios pedidos y bloqueadas que necesiten ayuda del coordinador.
