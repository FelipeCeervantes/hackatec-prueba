---
name: repartir
description: (Solo coordinador) Convierte el planteamiento del problema en tareas por rol dentro de tareas/. Uso: /repartir <problema>
argument-hint: <planteamiento del problema>
---

Problema: $ARGUMENTS

1. `git pull`. Mira `equipo/` para saber quién es integrante-1 y quién integrante-2. Asigna a cada uno un área (ej. integrante-1: backend/datos, integrante-2: frontend/presentación). Lo que necesite skills o extensiones que solo tiene el coordinador, asígnalo a `coordinador-NN`; si sirve, copia esa skill a `.claude/skills/` para compartirla.
2. Propón un MVP que se pueda demostrar en el tiempo del evento: una idea, un flujo y un demo. Muéstraselo al coordinador y espera su OK.
3. Divide el trabajo en tareas pequeñas (de 30 a 90 minutos cada una) e independientes entre roles. Crea `tareas/<rol>-NN-<slug>.md` con este formato ("Listo cuando" como casillas de 3 a 6 puntos y un `estimado` realista: con eso la oficina dibuja la barra de progreso y el tiempo que falta):
   ```
   estado: pendiente
   rol: integrante-1
   depende-de: (ninguna | integrante-2-02)
   estimado: 45 min
   # <título corto de la tarea>
   ## Qué hacer
   ## Listo cuando
   - [ ] <entregable concreto 1>
   - [ ] <entregable concreto 2>
   ## Archivos/área
   ```
4. Primero define el contrato entre backend y frontend (rutas y forma del JSON) en `tareas/contrato.md`, para que ambos puedan trabajar en paralelo.
5. Haz commit y push a `main`, y resume quién tiene qué.
