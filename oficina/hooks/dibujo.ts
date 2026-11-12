// La oficina como un SVG animado con CSS. Todo aquí es puro (sin $ ni estado),
// así se puede probar con node: node hooks/dibujo.ts > prueba.svg (ver demo() al final).

import type { Anim, Equipo, Escena, Miembro, Progreso, Yo } from '../types'

export type Escenario = { now: number; eq: Equipo; yo: Yo; anims: Anim[]; escena: Escena | null; guia: string | null }
type Pose = string
type Integrante = Miembro & { yo: boolean }

export const COLORES: Record<string, string> = {
  naranja: '#D97757', azul: '#5b8def', verde: '#4fb06d', morado: '#9b6bd6', rosa: '#e07aa8', amarillo: '#d9b44a',
}
export const ACCESORIOS = ['ninguno', 'lentes', 'gorra', 'helice', 'corona', 'antena']
const ACC_POR_ROL: Record<string, string> = { coordinador: 'lentes', 'integrante-1': 'gorra', 'integrante-2': 'helice', 'integrante-3': 'antena' }
const PIXELES: Record<string, string[]> = {
  gorra: ['................', '....rrrrrrrr....', '...rrrrrrrrrrrr.'],
  helice: ['......yyyy......', '.......b........', '....bbbbbbbb....'],
  corona: ['................', '....y..yy..y....', '....yyyyyyyy....'],
  antena: ['.......r........', '.......k........', '.......k........'],
}
const LENTES = ['....g.gggg.g....', '....g.g..g.g....']
const PAL: Record<string, string> = { k: '#1a1a1a', g: '#222', r: '#d64545', b: '#3a6ff0', y: '#f5d142' }

export const ETIQUETA: Record<string, string> = {
  pensando: 'pensando...', trabajando: 'trabajando', durmiendo: 'durmiendo', esperando: 'te necesita', listo: 'en espera',
  caminando: 'entregando archivos', explorando: 'explorando planetas', celebrando: '¡terminó!', triste: 'bloqueado, necesita ayuda',
  sorprendido: '¡alerta!', atento: 'en la junta', explicando: 'explicando', saludando: 'entregando archivos', feliz: 'recibiendo',
}

const W = 240, H = 135, FLOOR = 100, K = '#1a1a1a'
const n2 = (v: number) => Math.round(v * 100) / 100
const r = (x: number, y: number, w: number, h: number, c: string, extra = '') =>
  `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${c}"${extra}/>`
const limpio = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] as string)
const txt = (x: number, y: number, s: string, size: number, color: string, bold = false, anchor = 'middle', extra = '') =>
  `<text x="${n2(x)}" y="${n2(y)}" font-size="${size}" fill="${color}" text-anchor="${anchor}"${bold ? ' font-weight="bold"' : ''}${extra}>${limpio(s)}</text>`
// Desfase de un ciclo según la hora real: al redibujar, la animación sigue donde iba en vez de reiniciar.
const fase = (now: number, periodo: number, off = 0) => ` style="animation-delay:-${(((now + off) % periodo) / 1000).toFixed(2)}s"`
const unaVez = (nombre: string, dur: number, E: number, curva = 'linear') =>
  ` style="animation:${nombre} ${dur / 1000}s ${curva} 1 forwards;animation-delay:-${(E / 1000).toFixed(2)}s"`

const CSS = `text{font-family:Consolas,monospace}
.ab{animation:parp 4.2s steps(1) infinite}.ce{animation:parp2 4.2s steps(1) infinite}
@keyframes parp{0%,96%{opacity:1}97%,100%{opacity:0}}@keyframes parp2{0%,96%{opacity:0}97%,100%{opacity:1}}
.p-trabajando,.p-caminando{animation:s1 .36s steps(1) infinite}@keyframes s1{50%{transform:translateY(-1px)}}
.p-esperando{animation:s3 .36s ease-in-out infinite}@keyframes s3{50%{transform:translateY(-6px)}}
.p-celebrando,.p-sorprendido{animation:s4 .32s ease-in-out infinite}@keyframes s4{50%{transform:translateY(-8px)}}
.p-feliz{animation:s2 .44s ease-in-out infinite}@keyframes s2{50%{transform:translateY(-3px)}}
.p-listo,.p-saludando,.p-atento,.p-explicando{animation:resp 2.8s steps(1) infinite}
.p-durmiendo,.p-triste{animation:resp 1.8s steps(1) infinite}@keyframes resp{50%{transform:translateY(1px)}}
.bi{animation:brazo .36s steps(1) infinite}.bd{animation:brazo .36s steps(1) infinite;animation-delay:-.18s}
@keyframes brazo{50%{transform:translateY(-2px)}}
.ola{animation:ola .4s steps(1) infinite}@keyframes ola{50%{transform:translateY(2px)}}
.mira{animation:mira 2.6s steps(1) infinite}@keyframes mira{0%{transform:translateX(-2px)}50%{transform:translateX(2px)}}
.mira4{animation:mira4 6.4s steps(1) infinite}@keyframes mira4{25%{transform:translateX(-2px)}50%{transform:translateX(0)}75%{transform:translateX(2px)}}
.pa{animation:pata .3s steps(1) infinite}.pb{animation:pata .3s steps(1) infinite;animation-delay:-.15s}
@keyframes pata{50%{opacity:0}}
.giro{transform-box:fill-box;transform-origin:center;animation:giro .3s steps(1) infinite}
@keyframes giro{50%{transform:scaleX(-1)}}
.z{opacity:0;animation:zz 1.8s linear infinite}
@keyframes zz{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(6px,-14px)}}
.est{animation:tw 1.2s steps(1) infinite}@keyframes tw{50%{opacity:.35}}
.flota{animation:flota 2s ease-in-out infinite}@keyframes flota{50%{transform:translateY(-2px)}}
.gota{animation:gota .7s linear infinite}@keyframes gota{100%{transform:translateY(6px);opacity:0}}
.flash{animation:flash .5s steps(1) infinite}@keyframes flash{0%{opacity:.18}50%{opacity:0}}
.conf{animation:caer 3s linear infinite}@keyframes caer{0%{transform:translateY(-10px)}100%{transform:translateY(145px)}}
.pant{animation:pant .7s steps(1) infinite}@keyframes pant{50%{opacity:.55}}
.fuego{animation:fuego .2s steps(1) infinite}@keyframes fuego{50%{transform:scaleY(1.4)}}
@keyframes fuera{0%{opacity:1}17%,100%{opacity:0}}
@keyframes cajas{0%{opacity:0}17%,35.6%{opacity:1}35.7%,100%{opacity:0}}
@keyframes cargar{0%,35.6%{opacity:0}35.7%,100%{opacity:1}}
@keyframes folder{0%,50%{opacity:1}50.1%,100%{opacity:0}}`

export function parseIdentidad(t: string): Miembro {
  const n = /Soy\s+([^.\n]+)/i.exec(t), r2 = /rol es\s+(coordinador|integrante-\d)/i.exec(t)
  return { nombre: n ? n[1].trim() : 'Yo', rol: r2 ? r2[1].toLowerCase() : 'integrante-1' }
}

// Una tarea: estado, "estimado: 45 min", "inicio: <fecha>" y casillas "- [ ]" / "- [x]".
export function parseTarea(t: string, nombre: string): Progreso & { estado: string } {
  const estado = (/^estado:\s*(.+)$/m.exec(t) || [])[1] || ''
  const total = (t.match(/^\s*- \[[ xX]\]/gm) || []).length
  const hechos = (t.match(/^\s*- \[[xX]\]/gm) || []).length
  const estimado = Number((/^estimado:\s*(\d+)/m.exec(t) || [])[1] || 0)
  const inicio = Date.parse((/^inicio:\s*(.+)$/m.exec(t) || [])[1] || '') || 0
  const titulo = ((/^#+\s*(.+)$/m.exec(t) || [])[1] || nombre).trim()
  return { estado: estado.trim(), total, hechos, estimado, inicio, titulo }
}

export function progresoTexto(p: Progreso, now: number): string {
  let s = p.total ? `${p.hechos}/${p.total}` : 'en curso'
  if (p.estimado && p.inicio) {
    const resta = Math.round(p.estimado - (now - p.inicio) / 60000)
    s += resta > 0 ? ` · ~${resta} min` : ` · +${-resta} min`
  }
  return s
}

export function miembros(eq: Equipo): Integrante[] {
  const igual = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
  const list = eq.equipo.map(m => ({ ...m, yo: false }))
  if (!list.some(m => igual(m.nombre, eq.yo.nombre))) list.push({ ...eq.yo, yo: false })
  if (!list.some(m => m.rol === 'coordinador')) list.push({ nombre: 'Coordinación', rol: 'coordinador', yo: false })
  list.forEach(m => (m.yo = igual(m.nombre, eq.yo.nombre)))
  return list.sort((a, b) => Number(a.rol === 'coordinador') - Number(b.rol === 'coordinador') || a.rol.localeCompare(b.rol))
}

// Sin actividad: 2 min durmiendo, 10 min explorando. Los demás, según su último push en GitHub.
export function poseDe(m: Integrante, eq: Equipo, yo: Yo, now: number): Pose {
  const bloqueado = eq.bloqueados.includes(m.rol)
  if (m.yo) {
    const e = yo.estado || 'listo', t = yo.t || 0
    if (now - t > 600000) return 'explorando'
    if (bloqueado && e !== 'trabajando' && e !== 'pensando') return 'triste'
    if (e === 'listo' && now - t < 4000) return 'celebrando'
    if (e === 'entregando') return 'trabajando'
    if (e === 'listo' || e === 'esperando') return now - t > 120000 ? 'durmiendo' : e
    return e
  }
  if (bloqueado) return 'triste'
  const edad = now - (eq.ultimo[m.rol] || 0) * 1000
  return edad < 15 * 60000 ? 'trabajando' : edad < 45 * 60000 ? 'durmiendo' : 'explorando'
}

export function pasosGuia(eq: Equipo): string[] {
  const jefe = miembros(eq).find(m => m.rol === 'coordinador')?.nombre || 'quien coordina'
  return [
    `¡Hola, ${eq.yo.nombre}! Te doy la bienvenida a la oficina.`,
    'Este de aquí soy yo, y este es nuestro cuarto.',
    'Cuando quieras trabajar, escribe en el chat:\nhaz mis tareas',
    'La barra de abajo muestra cuánto llevamos\nde la tarea y cuánto falta, más o menos.',
    `Cuando termine, le llevo los archivos a ${jefe}\npara que los revise.`,
    'Si no hacemos nada un rato, me voy a explorar el espacio.\n¡Nos vemos en el Hackatec!',
  ]
}

const personaje = (eq: Equipo, m: Miembro) => {
  const p = eq.personajes[m.nombre.toLowerCase()] || {}
  return { color: COLORES[p.color || ''] || COLORES.naranja, acc: p.accesorio || ACC_POR_ROL[m.rol] || 'ninguno' }
}

function grid(rows: string[], fila: number, cols: Record<string, string>) {
  let s = ''
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') s += r(i * 2, (fila + j) * 2, 2, 2, cols[ch]) }))
  return s
}

// El bichito en coordenadas locales (0..32 de ancho, el cuerpo de 0 a 16 y las patas hasta 20).
function bicho(pose: Pose, color: string, acc: string, now: number, off: number): string {
  const ab = (ojos: string) =>
    `<g class="ab"${fase(now, 4200, off)}>${ojos}</g><g class="ce"${fase(now, 4200, off)}>${r(8, 6, 4, 2, K)}${r(20, 6, 4, 2, K)}</g>`
  const normal = (ox: number) => r(10 + ox, 4, 2, 4, K) + r(20 + ox, 4, 2, 4, K)
  const feliz = r(8, 6, 2, 2, K) + r(10, 4, 2, 2, K) + r(12, 6, 2, 2, K) + r(18, 6, 2, 2, K) + r(20, 4, 2, 2, K) + r(22, 6, 2, 2, K)
    + r(8, 8, 2, 2, '#f2a0a0') + r(22, 8, 2, 2, '#f2a0a0')
  const grandes = r(10, 4, 4, 4, K) + r(18, 4, 4, 4, K)
  const cerrados = r(8, 6, 4, 2, K) + r(20, 6, 4, 2, K)
  const brazo = (x: number, y: number, clase = '') => clase ? `<g class="${clase}">${r(x, y, 4, 4, color)}</g>` : r(x, y, 4, 4, color)
  let ojos = ab(`<g class="mira4"${fase(now, 6400, off)}>${normal(0)}</g>`), brazos = brazo(2, 8) + brazo(26, 8)
  if (pose === 'trabajando') { ojos = ab(normal(2)); brazos = brazo(2, 8, 'bi') + brazo(26, 8, 'bd') }
  else if (pose === 'pensando') { ojos = ab(`<g class="mira">${r(10, 2, 2, 4, K) + r(20, 2, 2, 4, K)}</g>`); brazos = brazo(2, 8) + brazo(26, 4) }
  else if (pose === 'esperando') { ojos = grandes; brazos = brazo(2, 2, 'ola') + brazo(26, 8) }
  else if (pose === 'durmiendo') { ojos = cerrados; brazos = brazo(2, 10) + brazo(26, 10) }
  else if (pose === 'triste') { ojos = r(10, 6, 2, 2, K) + r(12, 4, 2, 2, K) + r(20, 6, 2, 2, K) + r(18, 4, 2, 2, K); brazos = brazo(2, 10) + brazo(26, 10) }
  else if (pose === 'celebrando') { ojos = feliz; brazos = brazo(2, 2) + brazo(26, 2) }
  else if (pose === 'saludando') { ojos = feliz; brazos = brazo(2, 8) + brazo(26, 2, 'ola') }
  else if (pose === 'feliz') { ojos = feliz }
  else if (pose === 'sorprendido') { ojos = grandes; brazos = brazo(2, 2) + brazo(26, 2) }
  else if (pose === 'atento') { ojos = ab(normal(2)) }
  else if (pose === 'explicando') { ojos = ab(normal(-2)); brazos = brazo(2, 8, 'bi') + brazo(26, 8, 'bd') }
  else if (pose === 'caminando') { ojos = ab(normal(0)) }
  const patas = (xs: number[]) => xs.map(x => r(x, 16, 2, 4, color)).join('')
  const piernas = pose === 'caminando'
    ? `<g class="pa">${patas([8, 12, 18, 22])}</g><g class="pb">${patas([6, 12, 18, 24])}</g>` : patas([8, 12, 18, 22])
  const accesorio = acc === 'lentes' ? grid(LENTES, 2, PAL) : PIXELES[acc] ? grid(PIXELES[acc], -3, PAL) : ''
  return `<g class="p-${pose}"${fase(now, 2800, off)}>${r(6, 0, 20, 16, color)}${ojos}${brazos}${piernas}${accesorio}</g>`
}

function burbuja(x: number, y: number, s: string) {
  const w = s.length * 3 + 6
  return r(x - w / 2, y - 7, w, 7, '#fff') + txt(x, y - 2, s, 5, '#111', true)
}
const zetas = (x: number, y: number) =>
  [0, 0.6, 1.2].map(d => `<g class="z" style="animation-delay:${d}s">${txt(x, y, 'z', 6, '#cfe0ff', true)}</g>`).join('')

function dialogo(t: string, pie: string, borde = '#f5d9a8') {
  const w = 206, h = 36, x = (W - w) / 2, y = 5
  let s = r(x - 1, y - 1, w + 2, h + 2, borde) + r(x, y, w, h, '#141a2b')
  t.split('\n').forEach((l, k) => (s += txt(W / 2, y + 13 + k * 8, l, 5.5, '#fff', true)))
  return s + txt(W / 2, y + h - 3, pie, 3.6, '#9fb3d9')
}

function cuarto(x0: number, w: number, i: number, coord: boolean, pose: Pose, now: number, muebles: string) {
  let s = r(x0, 0, w, FLOOR, coord ? '#3b2f4a' : ['#22314f', '#1f3d3a', '#3a2a2a'][i % 3]) + r(x0, FLOOR, w, H - FLOOR, '#6b4f3a')
  for (let k = 6; k < H - FLOOR; k += 7) s += r(x0, FLOOR + k, w, 1, '#5a4130')
  s += r(x0 + 6, 14, 24, 18, '#8a8fa8') + r(x0 + 7, 15, 22, 16, '#0b1030')
  ;[[3, 3], [15, 5], [9, 11], [19, 13], [5, 14]].forEach(([a, b], k) =>
    (s += `<g class="est"${fase(now, 1200, k * 300)}>${r(x0 + 7 + a, 15 + b, 1, 1, '#fff')}</g>`))
  s += r(x0 + 20, 18, 4, 4, coord ? '#e0a050' : '#6a8fd0')
  if (pose === 'explorando') s += `<g class="flota">${r(x0 + 12, 21, 3, 2, '#D97757')}${r(x0 + 12, 23, 1, 1, '#D97757')}${r(x0 + 14, 23, 1, 1, '#D97757')}</g>`
  s += r(x0 + w - 1, 0, 1, H, '#0b0f1a')
  const dx = x0 + w - 33
  const pantalla = ({ trabajando: '#2f6fd0', pensando: '#24406e', esperando: '#d0a020' } as Record<string, string>)[pose] || '#0d1118'
  let m = r(dx, FLOOR - 14, 30, 3, '#8b5a2b') + r(dx + 2, FLOOR - 11, 2, 11, '#6d4421') + r(dx + 26, FLOOR - 11, 2, 11, '#6d4421')
    + r(dx + 8, FLOOR - 28, 16, 12, '#222') + r(dx + 15, FLOOR - 16, 2, 2, '#222') + r(dx + 9, FLOOR - 27, 14, 10, pantalla)
  if (pose === 'trabajando') m += `<g class="pant">${[6, 9, 4, 8].map((l, k) => r(dx + 10, FLOOR - 26 + k * 2, l, 1, '#cfe8ff')).join('')}</g>`
  return s + (muebles ? `<g${muebles}>${m}</g>` : m)
}

function cohete(x: number, y: number, fuego: boolean) {
  const R = '#d64545'
  return r(x - 2, y, 4, 2, R) + r(x - 4, y + 2, 8, 2, R) + r(x - 6, y + 4, 12, 2, R) + r(x - 6, y + 6, 12, 20, '#e8e8f0')
    + r(x - 3, y + 10, 6, 6, '#3a6ff0') + r(x - 2, y + 11, 2, 2, '#9cd') + r(x - 10, y + 18, 4, 8, R) + r(x + 6, y + 18, 4, 8, R)
    + r(x - 4, y + 26, 8, 2, '#555')
    + (fuego ? `<g class="fuego" style="transform-box:fill-box;transform-origin:top">${r(x - 3, y + 28, 6, 5, '#f5d142')}${r(x - 2, y + 28, 4, 3, '#e8743b')}</g>` : '')
}

function luna(x: Escenario, ms: Integrante[]) {
  let s = r(0, 0, W, H, '#05060f')
  for (let i = 0; i < 70; i++) s += `<g class="est"${fase(x.now, 1200, i * 170)}>${r((i * 53) % W, (i * 31 + i * i) % H, 1, 1, '#fff')}</g>`
  s += r(20, 18, 10, 10, '#3a6ff0') + r(22, 20, 4, 3, '#3fa34d') + r(25, 24, 3, 2, '#3fa34d')
  const cx = W / 2, cy = H + 95, R = 130, top = (px: number) => cy - Math.sqrt(Math.max(R * R - (px - cx) ** 2, 0))
  for (let y = cy - R; y < H; y++) { const hw = Math.sqrt(R * R - (y - cy) ** 2); s += r(cx - hw, y, hw * 2, 1, '#b8b8c4') }
  ;[[cx - 50, 6, 6], [cx + 18, 4, 8], [cx + 40, 14, 5]].forEach(([px, dy, z]) => (s += r(px, top(px) + dy, z, z / 2, '#9a9aa8')))
  s += cohete(cx + 70, top(cx + 70) - 29, false)
  ms.forEach((m, i) => {
    const px = cx - 80 + i * 34, y = top(px + 16) - 19, p = personaje(x.eq, m)
    s += `<g transform="translate(${n2(px)},${n2(y)})">${bicho('durmiendo', p.color, p.acc, x.now, i * 1777)}${zetas(18, -2)}</g>`
  })
  s += txt(W / 2, 14, 'HASTA MAÑANA, EQUIPO', 7, '#f5d9a8', true)
  if (x.escena && !x.escena.auto) s += txt(W / 2, 22, 'usa "Volver" para regresar a la oficina', 3.8, '#9fb3d9')
  return s
}

const envolver = (cuerpo: string, keyframes = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges"><style>${CSS}${keyframes}</style>${cuerpo}</svg>`

export function svgOficina(x: Escenario): string {
  const { now, eq, escena } = x
  const tipo = escena?.tipo, E = escena ? now - escena.start : 0
  const ms = miembros(eq)
  if (tipo === 'luna' && E > 7500) return envolver(luna(x, ms))
  if (tipo === 'adios' && E > 7000) {
    return envolver(r(0, 0, W, H, '#05060f') + txt(W / 2, 62, 'La oficina se desinstaló de esta carpeta.', 6, '#f5d9a8', true)
      + txt(W / 2, 72, 'Puedes cerrar este panel.', 4.5, '#9fb3d9'))
  }
  const w = W / ms.length
  // El escritorio pegado a la derecha y el bichito a su izquierda: cabe igual con 2, 3 o 4 cuartos.
  const casas = ms.map((_, i) => { const x0 = i * w, dx = x0 + w - 33; return { x0, dx, hx: Math.max(x0 + 1, dx - 31), hy: FLOOR - 20 } })
  const coordI = ms.findIndex(m => m.rol === 'coordinador'), coord = casas[coordI]
  const recibiendo = x.anims.some(a => now - a.start > 2400 && now - a.start < 3600)
  let fondo = '', frente = '', keyframes = ''
  ms.forEach((m, i) => {
    const c = casas[i], p = personaje(eq, m), off = i * 1777
    let pose = poseDe(m, eq, x.yo, now), etiqueta = '', mov = '', extra = '', clase = ''
    const muebles = tipo === 'adios' ? unaVez('fuera', 7000, E) : ''
    fondo += cuarto(c.x0, w, i, m.rol === 'coordinador', tipo ? 'durmiendo' : pose, now, muebles)
    if (tipo === 'adios') fondo += `<g${unaVez('cajas', 7000, E)}>${caja(c.dx + 8, FLOOR - 10)}</g>`
    if (x.guia && m.yo && !tipo) { pose = 'saludando'; etiqueta = 'te explica' }
    else if (tipo === 'luna') {
      pose = E < 2000 ? 'listo' : 'caminando'; etiqueta = 'a la nave'
      keyframes += `@keyframes m${i}{0%,26.7%{transform:translateX(0);opacity:1}66.6%{transform:translateX(${n2(W / 2 - 16 - c.hx)}px);opacity:1}66.7%,100%{transform:translateX(${n2(W / 2 - 16 - c.hx)}px);opacity:0}}`
      mov = unaVez(`m${i}`, 7500, E)
    } else if (tipo === 'adios') {
      pose = E < 2500 ? 'listo' : 'caminando'; etiqueta = 'empacando'
      keyframes += `@keyframes m${i}{0%,35.7%{transform:translateX(0)}100%{transform:translateX(${n2(W + 40 - c.hx)}px)}}`
      mov = unaVez(`m${i}`, 7000, E)
      extra = `<g${unaVez('cargar', 7000, E)}>${caja(9, -12)}</g>`
    } else if (tipo === 'fiesta') { pose = 'celebrando'; etiqueta = '¡a festejar!' }
    else if (tipo === 'alerta') {
      if (E < 1500) { pose = 'sorprendido'; extra = burbuja(16, -8, '!') }
      else if (E < 3500) { pose = 'caminando'; clase = 'giro' }
      else if (m.rol === 'coordinador') pose = E > 6000 && E < 10000 ? 'explicando' : 'atento'
      else pose = E > 6000 && E < 10000 ? 'atento' : 'caminando'
      etiqueta = E < 3500 ? ETIQUETA.sorprendido : ETIQUETA.atento
      if (m.rol !== 'coordinador') {
        const d = n2(coord.hx - 30 * (ms.length - 1 - i) - c.hx)
        keyframes += `@keyframes m${i}{0%,28%{transform:translateX(0)}48%,80%{transform:translateX(${d}px)}100%{transform:translateX(0)}}`
        mov = unaVez(`m${i}`, 12500, E)
      }
    } else {
      const a = x.anims.find(a => a.rol === m.rol && now - a.start < 6000)
      if (m.rol === 'coordinador' && recibiendo) { pose = 'feliz'; etiqueta = ETIQUETA.feliz; extra = burbuja(16, -8, '¡gracias!') }
      if (a) {
        const E2 = now - a.start, d = n2(coord.hx - 32 - c.hx)
        pose = E2 > 2400 && E2 < 3600 ? 'saludando' : 'caminando'; etiqueta = ETIQUETA.caminando
        keyframes += `@keyframes m${i}{0%{transform:translateX(0)}40%,60%{transform:translateX(${d}px)}100%{transform:translateX(0)}}`
        mov = unaVez(`m${i}`, 6000, E2)
        extra = `<g${unaVez('folder', 6000, E2, 'steps(1)')}>${r(24, 8, 10, 8, '#f5d142')}${r(24, 8, 4, 2, '#c9a227')}</g>`
      } else if (pose === 'pensando') extra = burbuja(16, -8, Math.floor(now / 2500) % 3 === 2 ? '?' : '...')
      else if (pose === 'esperando') extra = burbuja(16, -8, '!')
      else if (pose === 'celebrando') extra = burbuja(16, -8, '¡listo!')
      else if (pose === 'durmiendo') extra = zetas(20, -4)
      else if (pose === 'triste') {
        extra = r(8, -14, 16, 4, '#8a93a8') + r(10, -16, 9, 2, '#8a93a8')
          + [0, 1, 2].map(k => `<g class="gota" style="animation-delay:${k * 0.23}s">${r(11 + k * 5, -10, 1, 2, '#6aa0ff')}</g>`).join('')
      }
    }
    if (pose !== 'explorando') {
      const cuerpo = bicho(pose, p.color, p.acc, now, off)
      frente += `<g transform="translate(${n2(c.hx)},${n2(c.hy)})"><g${mov}>${clase ? `<g class="${clase}">${cuerpo}</g>` : cuerpo}${extra}</g></g>`
    }
    etiqueta = etiqueta || (m.rol === 'coordinador' && pose === 'trabajando' ? 'revisando' : ETIQUETA[pose] || pose)
    fondo += txt(c.x0 + w / 2, FLOOR + 10, m.nombre + (m.yo ? ' (tú)' : ''), 5.5, '#fff', true)
    fondo += txt(c.x0 + w / 2, FLOOR + 17, etiqueta, w < 70 ? 3.3 : 4, '#f5d9a8')
    const prog = eq.progreso[m.rol]
    if (prog) {
      const bw = w - 16, pct = prog.total ? prog.hechos / prog.total : 0
      fondo += r(c.x0 + 8, FLOOR + 21, bw, 3, '#3a2a1e') + r(c.x0 + 8, FLOOR + 21, bw * pct, 3, '#7fd16b')
      fondo += txt(c.x0 + w / 2, FLOOR + 30, progresoTexto(prog, now), 3.8, '#cfe8c8')
    }
  })
  let encima = ''
  if (tipo === 'luna') {
    encima += `<g style="animation:cohete 7.5s ease-in-out 1 forwards;animation-delay:-${(E / 1000).toFixed(2)}s">${cohete(W / 2, FLOOR - 32, true)}</g>`
    keyframes += '@keyframes cohete{0%{transform:translateY(-140px)}26.7%,66.7%{transform:translateY(0)}100%{transform:translateY(-170px)}}'
  }
  if (tipo === 'fiesta') {
    for (let k = 0; k < 60; k++)
      encima += `<g class="conf" style="animation-delay:-${((k * 0.37) % 3).toFixed(2)}s">${r((k * 41) % W, 0, 2, 1, ['#d64545', '#f5d142', '#3a6ff0', '#3fa34d', '#fff'][k % 5])}</g>`
    encima += dialogo('¡Se unió un avance al proyecto!', '¡bien, equipo!')
  } else if (tipo === 'alerta') {
    if (E < 3500) encima += `<g class="flash">${r(0, 0, W, H, '#ff2828')}</g>`
    encima += r(coord.dx + 1, FLOOR - 16, 6, 2, '#555') + r(coord.dx + 2, FLOOR - (E < 600 ? 16 : 17), 4, E < 600 ? 1 : 2, '#d64545')
    if (E > 3500) encima += dialogo('¡ALERTA!\n' + (escena?.mensaje || ''), 'junta rápida con el coordinador', '#d64545')
  } else if (x.guia && !tipo) {
    encima += dialogo(x.guia, 'usa "Siguiente" para continuar')
    const yo = casas[ms.findIndex(m => m.yo)]
    if (yo) encima += `<g class="flota">${r(yo.hx + 13, yo.hy - 14, 6, 2, '#f5d142')}${r(yo.hx + 15, yo.hy - 12, 2, 2, '#f5d142')}</g>`
  } else encima += txt(4, 6, 'OFICINA HACKATEC', 4, '#9fb3d9', true, 'start')
  return envolver(fondo + frente + encima, keyframes)
}

function caja(x: number, y: number) { return r(x, y, 14, 10, '#b98a4e') + r(x + 6, y, 2, 10, '#8a6234') }

// Demo para revisar el dibujo sin la app: node hooks/dibujo.ts [escena] > prueba.svg
export function demo(now: number, tipo?: string, cuarto = false): string {
  const eq: Equipo = {
    yo: { nombre: 'Felipe', rol: 'coordinador' },
    equipo: [{ nombre: 'Ana', rol: 'integrante-1' }, { nombre: 'Luis', rol: 'integrante-2' }, ...(cuarto ? [{ nombre: 'Carla', rol: 'integrante-3' }] : []), { nombre: 'Felipe', rol: 'coordinador' }],
    ultimo: { 'integrante-1': now / 1000, 'integrante-2': now / 1000 - 3600, 'integrante-3': now / 1000 - 1200 },
    bloqueados: tipo === 'triste' ? ['integrante-1'] : [],
    progreso: { 'integrante-1': { hechos: 3, total: 5, estimado: 45, inicio: now - 25 * 60000, titulo: 'API de datos' } },
    personajes: { luis: { color: 'azul' }, carla: { color: 'verde', accesorio: 'corona' } },
    tareas: [],
  }
  const escena = tipo && !['triste', 'entrega', 'guia'].includes(tipo) ?{ tipo: tipo as Escena['tipo'], start: now - 4500, mensaje: 'Cambio de planes' } : null
  const anims = tipo === 'entrega' ? [{ rol: 'integrante-1', start: now - 3000 }] : []
  return svgOficina({ now, eq, yo: { estado: 'pensando', t: now - 1000 }, anims, escena, guia: tipo === 'guia' ? pasosGuia(eq)[2] : null })
}
