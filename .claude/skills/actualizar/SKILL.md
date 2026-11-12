---
name: actualizar
description: Actualiza el plugin de la oficina de esta carpeta a la última versión del repo. Uso: /actualizar
---

1. `git pull`. El marketplace es el `name` de `.claude-plugin/marketplace.json`; la versión nueva, la `version` de `oficina/.claude-plugin/plugin.json`.
2. Busca el CLI de Claude: `claude` si está en el PATH; si no, el que trae la app de escritorio (Windows, PowerShell: `Get-ChildItem "$env:LOCALAPPDATA\Claude-Data" -Recurse -Filter claude.exe -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName`; Mac: dentro de `~/Library/Application Support/Claude`). Llámalo `<claude>`.
3. Desde esta carpeta: `<claude> plugin marketplace update <marketplace>` y luego `<claude> plugin update oficina@<marketplace> --scope local`.
4. Comprueba con `<claude> plugin list` que `oficina@<marketplace>` tenga la versión nueva y diga enabled. Si no cambió, desinstala e instala de nuevo con `--scope local`.
5. Dile en una línea que cierre esta sesión y abra una nueva en esta carpeta para ver la oficina actualizada.
