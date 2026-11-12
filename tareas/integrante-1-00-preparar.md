estado: hecha
revisado: 2026-11-11T23:23:40-06:00
inicio: 2026-11-11T23:15:38-06:00
rol: integrante-1
depende-de: ninguna
estimado: 10 min
# Preparar tu Claude

## Qué hacer
Corre la skill `/preparar`: instala en esta carpeta los plugins y skills esenciales del equipo (lista en `.claude/esenciales.json`) y comprueba que queden activos. No hay código que escribir: solo marca las casillas y sube tu rama como en cualquier tarea.

## Listo cuando
- [x] Marketplaces agregados (anthropics/claude-plugins-official y addyosmani/agent-skills)
- [x] Plugins instalados y en "enabled"
- [x] Buscador de skills (find-skills) instalado
- [x] Tabla final con lo instalado anotada aquí abajo y tarea en `lista-para-revision`

## Archivos/área
Ninguno del proyecto (todo queda en la configuración local de esta carpeta).

## Resultado

| Qué | Estado |
|---|---|
| Marketplace anthropics/claude-plugins-official | ✅ (ya estaba) |
| Marketplace addyosmani/agent-skills | ✅ |
| frontend-design | ✅ enabled |
| feature-dev | ✅ enabled |
| code-review | ✅ enabled |
| commit-commands | ✅ enabled |
| code-simplifier | ✅ enabled |
| playwright | ✅ enabled |
| context7 | ✅ enabled |
| agent-skills@addy-agent-skills | ✅ enabled |
| find-skills (vercel-labs/skills) | ✅ ya instalada |
| oficina@hackatec-prueba (extra) | ✅ enabled |

Todo con `--scope local` (usando el CLI de la app de escritorio).
