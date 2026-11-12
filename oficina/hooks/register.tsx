import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Aviso, Anim, Equipo, Escena, Miembro, Personaje, Progreso, Solicitud, Tarea, Vista, Yo } from '../types'
import {
  ACCESORIOS, COLORES, ETIQUETA, miembros, parseIdentidad, parseTarea, pasosGuia, poseDe, progresoTexto, svgOficina,
} from './dibujo'

// La oficina del equipo como panel junto al chat. Se activa solo dentro del repo del equipo:
// lee GitHub cada 15 s (equipo/, ramas, tareas, alertas y personajes) y los hooks de esta sesión.

type $ = EngineInterface

const PANE = 'oficina'
const PLUGIN_ID = 'oficina@hackatec-prueba'
const VACIO: Equipo = { yo: { nombre: 'Yo', rol: 'integrante-1' }, equipo: [], ultimo: {}, bloqueados: [], progreso: {}, personajes: {}, tareas: [] }

const yoA = atom({ plugin: 'oficina', key: 'yo' } as const, { estado: 'listo', t: 0 } as Yo)
const eqA = atom({ plugin: 'oficina', key: 'equipo' } as const, VACIO)
const animsA = atom({ plugin: 'oficina', key: 'anims' } as const, [] as Anim[])
const escenaA = atom({ plugin: 'oficina', key: 'escena' } as const, null as Escena | null)
const vistaA = atom({ plugin: 'oficina', key: 'vista' } as const, { modo: 'oficina', tam: 'mediano', panel: '' } as Vista)
const guiaA = atom({ plugin: 'oficina', key: 'guia' } as const, -1)
const tickA = atom({ plugin: 'oficina', key: 'tick' } as const, 0)
const actividadA = atom({ plugin: 'oficina', key: 'actividad' } as const, [] as Aviso[])

// Momentos en que cambia la cara o la pose dentro de cada escena (para redibujar justo ahí).
const CORTES: Record<Escena['tipo'], number[]> = {
  luna: [2000, 7500], adios: [2500, 7000], fiesta: [4500], alerta: [600, 1500, 3500, 6000, 10000, 12500], llegada: [3000, 5500],
}
const FIN: Record<Escena['tipo'], number> = { luna: 0, adios: 0, fiesta: 4500, alerta: 12500, llegada: 5600 }

let raiz = ''
let ramas: Record<string, string> = {}
let mainTs: string | null = null
let alertaT = 0
let primera = true
let lunaAuto = false
const estados: Record<string, string> = {}
const conocidos = new Set<string>()
let repoActual = '' // "dueño/repo" del remoto origin
let token = ''
const avisadas = new Set<number>()

const json = (t: string) => { try { return JSON.parse(t) } catch { return {} } }

// --- Solicitudes para unirse (solo el coordinador) ---------------------------------------
// Los integrantes abren un issue en el repo público <dueño>/hackatec-entrada con "repo: <este repo>".
// Aquí se listan y, con un clic del coordinador, se les invita usando su propia sesión de GitHub.
const solicitudesA = atom({ plugin: 'oficina', key: 'solicitudes' } as const, [] as Solicitud[])
const entrada = () => `${repoActual.split('/')[0]}/hackatec-entrada`

async function gh($: $, metodo: string, ruta: string, cuerpo?: unknown): Promise<any> {
  if (!token) token = (/^password=(.*)$/m.exec(await git($, ['credential', 'fill'], 'protocol=https\nhost=github.com\n\n')) || [])[1] || ''
  if (!token) return null
  const args = ['curl', '-s', '-X', metodo, '-H', '@-', '-H', 'Accept: application/vnd.github+json', `https://api.github.com${ruta}`]
  if (cuerpo !== undefined) args.push('-d', JSON.stringify(cuerpo))
  try {
    const r = await $.process.run(args, { stdin: `Authorization: Bearer ${token}\n`, timeoutMs: 20000 }) // el token va por stdin, no en la línea de comandos
    return r.stdout ? json(r.stdout) : {}
  } catch { return null }
}

async function sondearSolicitudes($: $) {
  if ((await read($, eqA)).yo.rol !== 'coordinador' || !repoActual) return
  const issues = await gh($, 'GET', `/repos/${entrada()}/issues?state=open&per_page=30`)
  if (!Array.isArray(issues)) return
  const sol: Solicitud[] = issues
    .filter(i => !i.pull_request && String(i.body || '').includes(`repo: ${repoActual}`))
    .map(i => ({ numero: i.number, login: i.user.login, nombre: String(i.title).replace(/^[^:]*:\s*/, '').slice(0, 30) || i.user.login }))
  for (const s of sol) if (!avisadas.has(s.numero)) { avisadas.add(s.numero); $.ui.toast(`${s.nombre} (@${s.login}) quiere unirse al equipo: apruébalo en la oficina.`) }
  await update($, solicitudesA, () => sol)
}

async function responder($: $, s: Solicitud, invitar: boolean) {
  if (invitar) await gh($, 'PUT', `/repos/${repoActual}/collaborators/${s.login}`, { permission: 'push' })
  await gh($, 'POST', `/repos/${entrada()}/issues/${s.numero}/comments`, {
    body: invitar
      ? `¡Listo, ${s.nombre}! Te envié la invitación. Acéptala aquí: https://github.com/${repoActual}/invitations`
      : 'Esta solicitud no se aprobó. Si es un error, avísale al coordinador.',
  })
  await gh($, 'PATCH', `/repos/${entrada()}/issues/${s.numero}`, { state: 'closed' })
  await update($, solicitudesA, l => l.filter(x => x.numero !== s.numero))
  $.ui.toast(invitar ? `Invitación enviada a @${s.login}` : `Solicitud de @${s.login} rechazada`)
}
const rolDeRama = (ref: string) => (/^origin\/(integrante-\d)\//.exec(ref) || [])[1]

async function git($: $, args: string[], stdin?: string): Promise<string> {
  try {
    const r = await $.process.run(['git', ...args], { cwd: raiz, stdin, timeoutMs: 30000 })
    return r.exitCode === 0 ? r.stdout : ''
  } catch { return '' }
}
async function leer($: $, ruta: string) { try { return await $.fs.read(ruta) } catch { return '' } }
const redibujar = ($: $) => update($, tickA, n => n + 1)
const despues = ($: $, ms: number) => $.clock.after(ms, () => void redibujar($))

// Un archivo en una rama propia con un commit hecho "a mano": no toca la carpeta ni la rama de trabajo.
async function publicar($: $, rama: string, archivo: string, contenido: string) {
  const blob = (await git($, ['hash-object', '-w', '--stdin'], contenido)).trim()
  const tree = blob && (await git($, ['mktree'], `100644 blob ${blob}\t${archivo}\n`)).trim()
  const commit = tree && (await git($, ['-c', 'user.name=Oficina', '-c', 'user.email=oficina@localhost', 'commit-tree', tree, '-m', `oficina: ${archivo}`])).trim()
  if (commit) await git($, ['push', '-q', '-f', 'origin', `${commit}:refs/heads/${rama}`])
}

async function empezar($: $, esc: Escena) {
  const actual = await read($, escenaA)
  if (actual && esc.tipo === 'fiesta' && actual.tipo !== 'fiesta') return // una fiesta no interrumpe otra escena
  await update($, escenaA, () => esc)
  for (const ms of CORTES[esc.tipo]) despues($, ms + 50)
  if (FIN[esc.tipo]) $.clock.after(FIN[esc.tipo] + 100, () => void update($, escenaA, e => (e && e.start === esc.start ? null : e)))
}

async function entrega($: $, rol: string, start: number) {
  await update($, animsA, l => (l.some(a => a.rol === rol && start - a.start < 6000) ? l : [...l.filter(a => start - a.start < 6000), { rol, start }]))
  for (const ms of [2450, 3650, 6050]) despues($, ms)
}

async function sondear($: $) {
  await git($, ['fetch', '-q', 'origin'])
  const now = await $.clock.now()
  const yo = parseIdentidad(await leer($, `${raiz}/CLAUDE.local.md`))
  const archivos = (await git($, ['ls-tree', '--name-only', 'origin/main', 'equipo/'])).split('\n').filter(f => /\.md$/.test(f) && !/README/i.test(f))
  const equipo: Miembro[] = []
  for (const f of archivos) {
    const rr = /(coordinador|integrante-\d)/i.exec(await git($, ['show', `origin/main:${f}`]))
    equipo.push({ nombre: f.replace(/^equipo\//, '').replace(/\.md$/, ''), rol: rr ? rr[1].toLowerCase() : 'integrante-1' })
  }
  const ultimo: Record<string, number> = {}
  const nuevas: string[] = []
  let fiesta = false
  const refs = await git($, ['for-each-ref', 'refs/remotes/origin', '--format=%(refname:short) %(committerdate:unix)'])
  for (const linea of refs.split('\n').filter(Boolean)) {
    const [ref, ts] = linea.split(' ')
    const rol = ref === 'origin/main' ? 'coordinador' : rolDeRama(ref)
    if (!rol) continue
    ultimo[rol] = Math.max(ultimo[rol] || 0, Number(ts))
    if (rol !== 'coordinador' && !primera && ramas[ref] !== ts) nuevas.push(rol)
    if (ref === 'origin/main') { if (!primera && mainTs !== ts) fiesta = true; mainTs = ts }
    ramas[ref] = ts
  }
  // Todas las tareas. La versión en la rama de su integrante manda sobre main, y lo local (mi rol) sobre todo.
  const porArchivo: Record<string, Tarea> = {}
  const tomar = (ruta: string, texto: string) => {
    const m = /^tareas\/((integrante-\d|coordinador)-[^/]+)\.md$/.exec(ruta)
    if (m) porArchivo[m[1]] = { archivo: m[1], rol: m[2], ...parseTarea(texto, m[1]) }
  }
  const leerRef = async (ref: string, rol?: string) => {
    for (const ruta of (await git($, ['ls-tree', '--name-only', ref, 'tareas/'])).split('\n')) {
      if (ruta.endsWith('.md') && (!rol || ruta.startsWith(`tareas/${rol}-`))) tomar(ruta, await git($, ['show', `${ref}:${ruta}`]))
    }
  }
  await leerRef('origin/main')
  for (const ref of Object.keys(ramas).filter(rolDeRama)) await leerRef(ref, rolDeRama(ref))
  try {
    for (const f of await $.fs.list(`${raiz}/tareas`)) {
      if (f.name.startsWith(`${yo.rol}-`)) tomar(`tareas/${f.name}`, await leer($, `${raiz}/tareas/${f.name}`))
    }
  } catch {}
  const tareas = Object.values(porArchivo).sort((a, b) => a.archivo.localeCompare(b.archivo))
  const bloqueados = [...new Set(tareas.filter(t => /^bloqueado/.test(t.estado)).map(t => t.rol))]
  const progreso: Record<string, Progreso> = {}
  for (const t of tareas) if (/^en-progreso/.test(t.estado) && !progreso[t.rol]) progreso[t.rol] = t

  // Actividad reciente: cambios de estado de las tareas, entregas, fiestas y alertas.
  const nombreDe = (rol: string) => equipo.find(m => m.rol === rol)?.nombre || rol
  const avisos: string[] = []
  for (const t of tareas) {
    const antes = estados[t.archivo], ahora = categoria(t.estado)
    if (!primera && antes !== ahora) avisos.push(`${nombreDe(t.rol)}: "${t.titulo}" ${ahora === 'pendiente' ? 'es nueva' : `pasó a ${ahora}`}`)
    estados[t.archivo] = ahora
  }
  const llegaron = equipo.filter(m => !conocidos.has(m.nombre.toLowerCase()))
  for (const m of equipo) conocidos.add(m.nombre.toLowerCase())
  if (!primera) for (const m of llegaron) avisos.push(`${m.nombre} se unió al equipo`)
  for (const rol of new Set(nuevas)) avisos.push(`${nombreDe(rol)} subió avances`)
  if (fiesta) avisos.push('Se unió un avance al proyecto')

  const a = json(await git($, ['show', 'origin/oficina-alerta:alerta.json']))
  if (!primera && a.t && a.t !== alertaT) {
    avisos.push(`Alerta: ${a.mensaje || ''}`)
    await empezar($, { tipo: 'alerta', start: now, mensaje: String(a.mensaje || '') })
  }
  alertaT = a.t || alertaT
  const personajes = json(await git($, ['show', 'origin/oficina-personajes:personajes.json'])) as Record<string, Personaje>

  const horaEntrega = Date.parse(json(await git($, ['show', 'origin/main:.claude/oficina.json'])).entrega || '') || undefined
  await update($, eqA, () => ({ yo, equipo, ultimo, bloqueados, progreso, personajes, tareas, entrega: horaEntrega }))
  if (avisos.length) await update($, actividadA, l => [...avisos.map(texto => ({ t: now, texto })).reverse(), ...l].slice(0, 8))
  for (const rol of new Set(nuevas)) await entrega($, rol, now)
  if (!primera && llegaron.length) await empezar($, { tipo: 'llegada', start: now, mensaje: llegaron[0].nombre, rol: llegaron[0].rol })
  else if (fiesta) await empezar($, { tipo: 'fiesta', start: now })
  primera = false
}

const categoria = (estado: string) =>
  /^en-progreso/.test(estado) ? 'en curso' : /^lista/.test(estado) ? 'en revisión' : /^bloqueado/.test(estado) ? 'bloqueada'
    : /^hecha/.test(estado) ? 'hecha' : 'pendiente'

// Cada 5 s: redibuja (dormir, explorar) y manda a todos a la luna cuando nadie está activo.
async function latido($: $) {
  const now = await $.clock.now(), eq = await read($, eqA), yo = await read($, yoA), escena = await read($, escenaA)
  const fuera = miembros(eq).every(m => poseDe(m, eq, yo, now) === 'explorando')
  if (fuera && !escena && !lunaAuto) { lunaAuto = true; await empezar($, { tipo: 'luna', start: now, auto: true }) }
  if (!fuera) { lunaAuto = false; if (escena?.auto) await update($, escenaA, () => null) }
  await redibujar($)
}

async function marcar($: $, estado: string) {
  const t = await $.clock.now()
  await update($, yoA, () => ({ estado, t }))
}

async function cambiarVista($: $, cambio: Partial<Vista>) {
  const v = { ...(await read($, vistaA)), ...cambio }
  await update($, vistaA, () => v)
  await $.store.set('vista', { modo: v.modo, tam: v.tam })
}

async function guardarPersonaje($: $, cambio: Personaje) {
  const eq = await read($, eqA), clave = eq.yo.nombre.toLowerCase()
  await git($, ['fetch', '-q', 'origin', 'oficina-personajes'])
  const todos = json(await git($, ['show', 'origin/oficina-personajes:personajes.json'])) as Record<string, Personaje>
  todos[clave] = { ...eq.personajes[clave], ...todos[clave], ...cambio }
  await update($, eqA, e => ({ ...e, personajes: { ...e.personajes, [clave]: todos[clave] } }))
  await publicar($, 'oficina-personajes', 'personajes.json', JSON.stringify(todos, null, 2))
}

async function enviarAlerta($: $, mensaje: string) {
  const t = await $.clock.now(), texto = (mensaje.trim() || '¡Cambio de planes! Revisen las tareas.').slice(0, 80)
  alertaT = t
  await cambiarVista($, { panel: '' })
  await empezar($, { tipo: 'alerta', start: t, mensaje: texto })
  await publicar($, 'oficina-alerta', 'alerta.json', JSON.stringify({ t, mensaje: texto }))
}

// Desinstalar: empacan, se van, y el plugin queda apagado solo en esta carpeta (settings.local.json no se sube).
async function desinstalar($: $) {
  await cambiarVista($, { panel: '' })
  await empezar($, { tipo: 'adios', start: await $.clock.now() })
  const ruta = `${raiz}/.claude/settings.local.json`
  const s = json(await leer($, ruta))
  s.enabledPlugins = { ...(s.enabledPlugins || {}), [PLUGIN_ID]: false }
  await $.fs.write(ruta, JSON.stringify(s, null, 2))
  $.clock.after(12000, () => void $.ui.close({ id: PANE }))
}

async function avanzarGuia($: $) {
  const total = pasosGuia(await read($, eqA)).length
  const paso = (await read($, guiaA)) + 1
  await update($, guiaA, () => (paso >= total ? -1 : paso))
  if (paso >= total) await $.store.set('bienvenida', true)
}

const duracion = (min: number) => { const m = Math.round(min); return m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h` }
const barra = (p: { hechos: number; total: number }) => {
  const n = p.total ? Math.round((p.hechos / p.total) * 10) : 0
  return '█'.repeat(n) + '░'.repeat(10 - n)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const res = await next(e)
    raiz = await $.session.cwd()
    raiz = (await git($, ['rev-parse', '--show-toplevel'])).trim()
    if (!raiz || !(await $.fs.exists(`${raiz}/.claude/skills/tomar-rol`))) { raiz = ''; return res } // no es el repo del equipo
    await $.command.register({ name: 'oficina', description: 'Abre la oficina del equipo en un panel' })
    const v = (await $.store.get('vista')) as Partial<Vista> | undefined
    if (v) await update($, vistaA, (x): Vista => ({ ...x, ...v, panel: '' }))
    void $.ui.open({ id: PANE, title: 'Oficina Hackatec' })
    await marcar($, 'listo')
    await sondear($)
    const eq = await read($, eqA)
    if (eq.yo.rol !== 'coordinador' && !(await $.store.get('bienvenida'))) {
      await empezar($, { tipo: 'llegada', start: await $.clock.now(), mensaje: eq.yo.nombre, rol: eq.yo.rol })
      await update($, guiaA, () => 0)
      const t = $.clock.every(7000, () => void (async () => { if ((await read($, guiaA)) < 0) t.cancel(); else await avanzarGuia($) })())
    }
    $.clock.every(15000, () => void sondear($))
    $.clock.every(5000, () => void latido($))
    repoActual = (/github\.com[/:]([^/]+\/[^/\s]+?)(\.git)?\s*$/.exec(await git($, ['remote', 'get-url', 'origin'])) || [])[1] || ''
    if (eq.yo.rol === 'coordinador') { void sondearSolicitudes($); $.clock.every(30000, () => void sondearSolicitudes($)) }
    return res
  })

  on('command.run', { command: 'oficina' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Oficina Hackatec' })
    return { text: 'Oficina abierta.' }
  })

  on('prompt.submit', async ($, e, next) => {
    if (raiz) await marcar($, 'pensando')
    return next(e)
  }).catch(($, e, next) => next(e)) // si la oficina falla, el trabajo sigue

  on('tool.call', async ($, e, next) => {
    if (!raiz) return next(e)
    const push = e.tool === 'Bash' && /git\s+push/.test(e.command)
    await marcar($, push ? 'entregando' : 'trabajando')
    const res = await next(e)
    if (push && !res.isError) {
      const eq = await read($, eqA)
      if (eq.yo.rol !== 'coordinador') await entrega($, eq.yo.rol, await $.clock.now())
    }
    return res
  }).catch(($, e, next) => next(e)) // si la oficina falla, el trabajo sigue

  on('classic.Notification', async ($, e, next) => {
    if (raiz) await marcar($, 'esperando')
    return next(e)
  }).catch(($, e, next) => next(e)) // si la oficina falla, el trabajo sigue

  on('turn.complete', async ($, e, next) => {
    if (raiz) { await marcar($, 'listo'); despues($, 4100) }
    return next(e)
  }).catch(($, e, next) => next(e)) // si la oficina falla, el trabajo sigue

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button, Input, Select } = ui
    const Svg = e.surface !== 'terminal' && 'Svg' in ui ? ui.Svg : undefined // la terminal no dibuja SVG: ahí va la lista
    await read($, tickA)
    const now = await $.clock.now()
    const [yo, eq, anims, escena, vista, guia] = [
      await read($, yoA), await read($, eqA), await read($, animsA), await read($, escenaA), await read($, vistaA), await read($, guiaA),
    ]
    const ms = miembros(eq)
    const pasos = pasosGuia(eq)
    const guiaTexto = guia >= 0 && guia < pasos.length ? pasos[guia] : null
    const mio = eq.personajes[eq.yo.nombre.toLowerCase()] || {}
    const conMascotas = Svg && vista.modo === 'oficina'
    const ancho = { chico: 320, mediano: 480, grande: undefined }[vista.tam]
    const actividad = await read($, actividadA)
    const tareas = eq.tareas ?? []
    const nombreDe = (rol: string) => ms.find(m => m.rol === rol)?.nombre || rol
    const de = (cat: string) => tareas.filter(t => categoria(t.estado) === cat)
    const hace = (t: number) => { const m = Math.round((now - t) / 60000); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 60)} h` }
    const lista = (titulo: string, cat: string, max: number, color?: string) => {
      const ts = de(cat)
      if (!ts.length) return null
      return (
        <Box key={cat} flexDirection="column">
          <Text bold>{titulo} ({ts.length})</Text>
          {ts.slice(-max).map(t => <Text color={color} dimColor={cat === 'hecha'}>• {t.titulo} <Text dimColor>· {nombreDe(t.rol)}</Text></Text>)}
        </Box>
      )
    }
    const menu = vista.panel !== '' // el menú sigue abierto mientras se usa una de sus opciones
    const solicitudes = eq.yo.rol === 'coordinador' ? await read($, solicitudesA) : []

    return (
      <Box flexDirection="column" gap={1}>
        {conMascotas ? (
          <Svg
            source={svgOficina({ now, eq, yo, anims, escena, guia: guiaTexto })}
            alt={ms.map(m => `${m.nombre}: ${ETIQUETA[poseDe(m, eq, yo, now)] || ''}`).join('; ')}
            width={ancho}
          />
        ) : (
          <Box flexDirection="column">
            {ms.map(m => (
              <Text>
                <Text bold>{m.nombre}{m.yo ? ' (tú)' : ''}</Text> <Text dimColor>· {ETIQUETA[poseDe(m, eq, yo, now)]}</Text>
              </Text>
            ))}
          </Box>
        )}
        {guiaTexto && !conMascotas && <Text>{guiaTexto}</Text>}

        {solicitudes.length > 0 && (
          <Box flexDirection="column">
            <Text bold color="yellow">Quieren unirse al equipo</Text>
            {solicitudes.map(s => (
              <Box key={`sol-${s.numero}`} flexDirection="row" gap={1}>
                <Text>{s.nombre} <Text dimColor>@{s.login}</Text></Text>
                <Button key={`inv-${s.numero}`} label="Invitar" variant="primary" onPress={() => responder($, s, true)} />
                <Button key={`rec-${s.numero}`} label="Rechazar" dimColor onPress={() => responder($, s, false)} />
              </Box>
            ))}
          </Box>
        )}

        {/* Un solo botón visible; lo demás vive en Opciones. */}
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          {guiaTexto && <Button key="sig" label="Siguiente" variant="primary" onPress={() => avanzarGuia($)} />}
          <Button key="opciones" label={menu ? 'Cerrar opciones' : 'Opciones'} dimColor={!menu} onPress={() => cambiarVista($, { panel: menu ? '' : 'menu' })} />
        </Box>
        {menu && (
          <Box flexDirection="row" flexWrap="wrap" gap={1}>
            {eq.yo.rol === 'coordinador' && <Button key="alerta" label="Alerta" onPress={() => cambiarVista($, { panel: 'alerta' })} />}
            <Button
              key="dia"
              label={escena?.tipo === 'luna' ? 'Volver' : 'Cerrar el día'}
              onPress={async () => (escena?.tipo === 'luna' ? update($, escenaA, () => null) : empezar($, { tipo: 'luna', start: await $.clock.now() }))}
            />
            <Button key="modo" label={vista.modo === 'oficina' ? 'Sin mascotas' : 'Con mascotas'} onPress={() => cambiarVista($, { modo: vista.modo === 'oficina' ? 'pro' : 'oficina' })} />
            {conMascotas && (
              <Button key="tam" label={`Tamaño: ${vista.tam}`} onPress={() => cambiarVista($, { tam: vista.tam === 'chico' ? 'mediano' : vista.tam === 'mediano' ? 'grande' : 'chico' })} />
            )}
            <Button key="pers" label="Mi personaje" onPress={() => cambiarVista($, { panel: 'personaje' })} />
            <Button key="des" label="Desinstalar" dimColor onPress={() => cambiarVista($, { panel: 'desinstalar' })} />
          </Box>
        )}
        {vista.panel === 'alerta' && (
          <Input key="msg" label="Mensaje para el equipo" placeholder="¡Cambio de planes! Revisen las tareas." submitLabel="Enviar alerta" autoFocus onSubmit={v => enviarAlerta($, v)} />
        )}
        {vista.panel === 'personaje' && (
          <Box flexDirection="column" gap={1}>
            <Select key="color" label="Color" value={mio.color || 'naranja'} options={Object.keys(COLORES).map(c => ({ value: c, label: c }))} onSelect={v => guardarPersonaje($, { color: v })} />
            <Select key="acc" label="Accesorio" value={mio.accesorio || ''} options={ACCESORIOS.map(a => ({ value: a, label: a }))} onSelect={v => guardarPersonaje($, { accesorio: v })} />
            <Text dimColor>Todo el equipo verá tu personaje en su oficina en menos de 20 s.</Text>
          </Box>
        )}
        {vista.panel === 'desinstalar' && (
          <Box flexDirection="column" gap={1}>
            <Text>¿Quitar la oficina de esta carpeta? Se apaga solo en tu laptop; puedes volver a activarla borrando .claude/settings.local.json.</Text>
            <Box flexDirection="row" gap={1}>
              <Button key="si" label="Sí, desinstalar" onPress={() => desinstalar($)} />
              <Button key="no" label="Cancelar" onPress={() => cambiarVista($, { panel: '' })} />
            </Box>
          </Box>
        )}

        {/* Tablero: lo que se está haciendo, lo que falta y lo que ya quedó. */}
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            <Text bold>En curso</Text>
            {de('en curso').length === 0 && <Text dimColor>Nadie tiene una tarea en curso.</Text>}
            {de('en curso').map(t => (
              <Box key={t.archivo} flexDirection="column">
                <Text>{t.titulo} <Text dimColor>· {nombreDe(t.rol)}</Text></Text>
                <Text color="green" mono>{barra(t)} {progresoTexto(t, now)}</Text>
              </Box>
            ))}
          </Box>
          {lista('Bloqueadas', 'bloqueada', 5, 'red')}
          {lista('En revisión', 'en revisión', 5, 'yellow')}
          {lista('Pendientes', 'pendiente', 6)}
          {lista('Hechas', 'hecha', 5)}
          {tareas.length === 0 && <Text dimColor>Todavía no hay tareas. Se crean con /repartir.</Text>}
          {tareas.length > 0 && (
            <Box flexDirection="column">
              <Text bold>Resumen</Text>
              <Text color="green" mono>{barra({ hechos: de('hecha').length, total: tareas.length })} {Math.round((de('hecha').length / tareas.length) * 100)}% del proyecto ({de('hecha').length}/{tareas.length} tareas)</Text>
              <Text dimColor>Trabajo estimado que falta: {duracion(tareas.filter(t => categoria(t.estado) !== 'hecha').reduce((s, t) => s + Math.max(0, t.estimado - (t.inicio ? (now - t.inicio) / 60000 : 0)), 0))}</Text>
              <Text dimColor>Hechas por persona: {ms.map(m => `${m.nombre} ${tareas.filter(t => t.rol === m.rol && categoria(t.estado) === 'hecha').length}`).join(' · ')}</Text>
            </Box>
          )}
          {eq.entrega && <Text bold color={eq.entrega - now < 3600000 ? 'red' : undefined}>{eq.entrega > now ? `Faltan ${duracion((eq.entrega - now) / 60000)} para la entrega` : 'Ya pasó la hora de entrega'}</Text>}
          {actividad.length > 0 && (
            <Box flexDirection="column">
              <Text bold>Actividad</Text>
              {actividad.slice(0, 5).map((a, k) => <Text dimColor>{hace(a.t)} · {a.texto}</Text>)}
            </Box>
          )}
        </Box>
      </Box>
    )
  })
}
