// Un GitHub y una laptop falsos para probar la oficina de punta a punta sin red ni procesos reales.
import { mock } from 'claude-code/testing'
import type { On } from 'claude-code'

export type Mundo = {
  identidad: string // contenido de CLAUDE.local.md
  equipo: Record<string, string> // nombre -> rol
  tareasMain: Record<string, string> // archivo (sin .md) -> contenido en main
  ramas: Record<string, Record<string, string>> // rama -> { archivo: contenido }
  alerta: string // alerta.json o ''
  compu: string // salida de PowerShell
  publicado: string[] // ramas a las que la oficina hizo push
  enviados: string[] // mensajes que la oficina mandó al Claude de la persona
}

export const nuevoMundo = (o: Partial<Mundo> = {}): Mundo => ({
  identidad: 'Soy Carlos. Mi rol es integrante-1.',
  equipo: { Carlos: 'integrante-1', Felipe: 'coordinador' },
  tareasMain: {}, ramas: {}, alerta: '',
  compu: '{"cpu":"Intel i3","nucleos":2,"ram":3.8,"disco":40,"gpu":"Intel UHD","so":"Windows 10"}',
  publicado: [], enviados: [], ...o,
})

const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
const falla = { value: { exitCode: 1, stdout: '', stderr: 'no', isStdoutTruncated: false, isStderrTruncated: false } }

function git(m: Mundo, a: string[]) {
  const s = a.join(' ')
  if (s.startsWith('rev-parse')) return ok('/repo\n')
  if (s.startsWith('fetch') || s.startsWith('hash-object') || s.startsWith('mktree')) return ok('abc\n')
  if (s.includes('commit-tree')) return ok('def\n')
  if (s.startsWith('push')) { m.publicado.push(a[a.length - 1]); return ok('') }
  if (s.startsWith('remote get-url')) return ok('https://github.com/equipo/prueba.git\n')
  if (s === 'ls-tree --name-only origin/main equipo/') return ok(Object.keys(m.equipo).map(n => `equipo/${n}.md`).join('\n'))
  const eq = /^show origin\/main:equipo\/(.+)\.md$/.exec(s)
  if (eq) return ok(`rol: ${m.equipo[eq[1]]}`)
  if (s.startsWith('for-each-ref')) return ok(['origin/main 1000', ...Object.keys(m.ramas).map(r => `origin/${r} 1000`)].join('\n'))
  const lt = /^ls-tree --name-only (\S+) tareas\/$/.exec(s)
  if (lt) {
    const archivos = lt[1] === 'origin/main' ? m.tareasMain : m.ramas[lt[1].replace(/^origin\//, '')] || {}
    return ok(Object.keys(archivos).map(f => `tareas/${f}.md`).join('\n'))
  }
  const sh = /^show (\S+):tareas\/(.+)\.md$/.exec(s)
  if (sh) {
    const archivos = sh[1] === 'origin/main' ? m.tareasMain : m.ramas[sh[1].replace(/^origin\//, '')] || {}
    return archivos[sh[2]] !== undefined ? ok(archivos[sh[2]]) : falla
  }
  if (s === 'show origin/oficina-alerta:alerta.json') return m.alerta ? ok(m.alerta) : falla
  return falla // personajes, equipos, PROYECTO.md, oficina.json: no existen
}

// Responde por debajo de la oficina todo lo que pide a la laptop y a la app.
export function simular(on: On, m: Mundo) {
  const clock = mock.clock(on, { now: 1_800_000_000_000 })
  mock.store(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('command.register', () => ({ value: { command: 'oficina' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('fs.exists', () => ({ value: true }))
  on('fs.read', (_, e) => (e.path.endsWith('CLAUDE.local.md') ? { value: m.identidad } : { value: '' }))
  on('fs.list', () => ({ value: [] }))
  on('fs.write', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => { m.enviados.push(e.text); return { text: e.text } })
  on('process.run', (_, e) => {
    const [cmd, ...args] = e.argv
    if (cmd === 'git') return git(m, args)
    if (cmd === 'powershell') return ok(m.compu)
    return falla
  })
  return clock
}

export const PANE = {
  plugin: 'oficina', component: 'Pane', requestId: 'oficina',
  props: { title: 'Oficina', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const
