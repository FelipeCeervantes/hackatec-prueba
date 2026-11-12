---
name: preparar
description: Instala en esta carpeta los plugins y skills esenciales del equipo (lista en .claude/esenciales.json) y comprueba que queden activos. Uso: /preparar
---

1. Lee `.claude/esenciales.json`. Muéstrale a la persona la lista en una tabla corta (nombre y para qué sirve) y pide **un solo OK** para instalar todo. Si quiere quitar alguno, respétalo.
2. Busca el CLI de Claude: `claude` si está en el PATH; si no, el que trae la app de escritorio (Windows, PowerShell: `Get-ChildItem "$env:LOCALAPPDATA\Claude-Data" -Recurse -Filter claude.exe -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName`; Mac: dentro de `~/Library/Application Support/Claude`). Llámalo `<claude>`.
3. Desde esta carpeta, por cada marketplace: `<claude> plugin marketplace add <marketplace>` (si ya existe, sigue).
4. Por cada plugin: `<claude> plugin install <plugin> --scope local`. Todo con `--scope local`: queda solo en esta carpeta y `/salir` lo quita después.
5. Skills: por cada entrada de `skills` ("repo skill"), corre `npx skills add <repo> --skill <skill>` dentro de esta carpeta (necesita Node.js). Si falla, sigue sin ella y dilo.
6. Verifica con `<claude> plugin list` que cada plugin diga enabled. Muestra una tabla final: instalado ✅ / falló ❌ (con el motivo en pocas palabras).
7. Si no hay CLI de ninguna forma, dile que escriba `/plugin install <plugin>` por cada uno en el chat, y deja la lista lista para copiar.
8. Avísale que los plugins nuevos se activan al abrir una **sesión nueva** en esta carpeta.
