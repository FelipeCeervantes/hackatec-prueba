# Reglas del equipo (para todos los agentes)

Somos un equipo de hackathon (NASA Space Apps / Hackatec). Cada integrante corre su propio Claude Code con su cuenta. La coordinación es solo por este repo.

## Al llegar (primera vez)
Si no existe `CLAUDE.local.md`, esta persona es nueva: sigue `.claude/skills/tomar-rol/SKILL.md` antes de cualquier otra cosa. No hace falta que te den nombre ni rol; la skill los resuelve. Roles válidos: `integrante-1`, `integrante-2` y `integrante-3` (solo si se suma una cuarta persona). El rol `coordinador` es solo de Felipe y no se le asigna a nadie más.

## Quién soy
Tu nombre y rol están en `CLAUDE.local.md` (es personal y no se sube al repo).

## Flujo
1. Siempre `git pull` antes de empezar. Si aparecen skills nuevas en `.claude/skills/` (las sube el coordinador), úsalas. Si el pull trajo cambios en `oficina/`, corre `/actualizar` para tener la oficina al día.
2. Las tareas viven en `tareas/<rol>-NN.md`. Solo toma las de **tu rol** con `estado: pendiente`, y primero las tuyas con `estado: cambios-pedidos` (en tu rama: atiende la sección "Cambios pedidos" y vuelve a dejarla en `lista-para-revision`).
3. Al tomar una tarea, crea tu rama `<rol>/<tarea>` (ej. `integrante-1/03-api-datos`), cambia su estado a `en-progreso: <nombre>`, agrega la línea `inicio: <fecha y hora ISO>` y haz commit y push de la rama. Nunca hagas push directo a `main`.
4. Cada vez que termines un punto de "Listo cuando", márcalo `- [x]`, haz commit y push de tu rama: así avanza la barra de progreso de la oficina y el equipo ve cuánto falta.
5. Al terminar: `estado: lista-para-revision`, haz push de la rama y abre un PR (o avisa al coordinador si no hay `gh`).
6. El **coordinador** revisa con `/revisar` (puede dejarlo automático con `/loop 5m /revisar`): si cumple, la une a `main` y la marca `estado: hecha`; si no, la deja en `estado: cambios-pedidos` con lo que falta. Solo el coordinador hace merge a `main`.

## Reglas
- Cambios pequeños y que funcionen. Mejor algo simple que ya corre que algo grande a medias.
- No toques archivos del área de otro rol sin dejar una nota en la tarea.
- Nunca subas claves, tokens ni `.env` al repo.
- Si estás bloqueado, o te falta una skill o extensión que no puedes instalar, escribe `bloqueado: <motivo>` en la tarea y haz push. El coordinador la comparte o hace él esa parte.
- Para ahorrar uso del plan Pro: los integrantes usan Sonnet; el coordinador puede usar Opus para revisar.

## Quién es quién
Cada integrante se registra en `equipo/<nombre>.md` con `/tomar-rol`.
