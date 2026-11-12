---
name: tomar-rol
description: Da la bienvenida a un integrante nuevo, le asigna nombre y rol, instala lo que necesita y le abre la oficina. Uso: /tomar-rol [Nombre] [rol]
argument-hint: [Nombre] [integrante-1|integrante-2|integrante-3]
---

Datos que dio el usuario (pueden venir vacíos): `$ARGUMENTS`.

1. `git pull`. Saluda en una línea, con buena onda.
2. **Nombre:** si no lo dio, lee `git config user.name` y pregunta una sola vez: "¿Te llamo <ese nombre> o prefieres otro?" (si no hay nombre en git, pregunta cómo se llama). Usa solo el primer nombre.
   **Rol:** si no lo dio, asígnale el primero de `integrante-1`, `integrante-2` o `integrante-3` que no aparezca en `equipo/`. El rol solo puede ser uno de esos tres; si pide `coordinador` (a menos que sea Felipe) u otro, dile cuáles son válidos. Si todos están ocupados, avísale y pregunta cuál toma.
3. Crea `equipo/<nombre>.md` con el nombre, el rol y la fecha. Haz commit y push a `main` (es el único push directo permitido).
   Además crea en la raíz `CLAUDE.local.md` (no se sube; está en `.gitignore`) con: `Soy <Nombre>. Mi rol es <rol>. Cuando diga "haz mis tareas", sigue el Flujo de CLAUDE.md con este rol.`
4. **Skills del rol** (busca y no inventes):
   - Si no está instalado el buscador de skills, instálalo: `npx skills add vercel-labs/skills --skill find-skills` (si falla, usa `npx skills find` directamente).
   - Mira las tareas de su rol en `tareas/`. Si aún no hay tareas, instala solo el buscador y deja la búsqueda para cuando lleguen. Si ya hay, saca de ellas 2 o 3 temas (ej. react, python, slides) y corre `npx skills find <tema>`.
   - Elige como máximo 3 en total, priorizando fuentes conocidas (anthropics, vercel-labs y repos con muchas instalaciones).
   - **Antes de instalar, muestra la lista al usuario y pide su OK.** Luego instala con `npx skills add <owner/repo> --skill <nombre>`, dentro del proyecto (no global).
   - Si `npx` no existe o no hay resultados, sigue sin skills y avísalo. Como alternativa puede usar `/plugin` para buscar en el marketplace.
5. La oficina: es el plugin `oficina@hackatec-prueba` de este repo (un panel junto al chat). Dile que la próxima vez que abra la carpeta `hackatec-prueba` en la pestaña Code, la app le pedirá confiar en la carpeta e instalar el plugin de la oficina: que acepte. Ahí su bichito le da la bienvenida. Si el panel no aparece, que escriba `/oficina`; si dice que el comando no existe, que escriba `/plugin install oficina@hackatec-prueba`.
6. Termina con este mensaje corto: su nombre y rol, que ya puede cerrar la sesión, y que el día del evento abre la carpeta `hackatec-prueba` en la pestaña Code y escribe "haz mis tareas". Si ya hay tareas pendientes de su rol, menciónalas.
