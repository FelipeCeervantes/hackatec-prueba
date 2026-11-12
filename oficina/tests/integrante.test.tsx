import { expect, test } from 'claude-code/testing'
import { nuevoMundo, PANE, simular } from './simulador'

const tarea = (estado: string) => `estado: ${estado}\nestimado: 10 min\n# Preparar tu Claude\n## Listo cuando\n- [x] uno\n- [x] dos\n`

test('integrante: hecha en main gana, la alerta lo pone a trabajar (1 vez cada 2 min) y su compu se publica', async ($, on) => {
  const m = nuevoMundo({
    tareasMain: { 'integrante-1-00-preparar': tarea('hecha') },
    ramas: { 'integrante-1/00-preparar': { 'integrante-1-00-preparar': tarea('lista-para-revision') } },
  })
  const clock = simular(on, m)
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })

  // 1. La tarea que ya se unió a main sale en Hechas aunque su rama siga "en revisión".
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /^Hechas/ }))?.text).toBe('Hechas (1)')
  expect(await ui.find({ type: 'Text', text: /^En revisión/ })).toBeUndefined()

  // 2. PC check: compu básica, publicada en oficina-equipos y visible en el tablero.
  await clock.advance(100)
  expect(m.publicado).toContain('def:refs/heads/oficina-equipos')
  expect((await ui.find({ type: 'Text', text: /básica/ }))?.text).toContain('Carlos: básica')

  // 3. Nada se manda sin motivo.
  expect(m.enviados.length).toBe(0)

  // 4. Llega una alerta: su Claude recibe el mensaje para ponerse a trabajar.
  m.alerta = JSON.stringify({ t: 111, mensaje: 'Cambio de planes' })
  await clock.advance(15000)
  expect(m.enviados.length).toBe(1)
  expect(m.enviados[0]).toContain('Alerta del coordinador')
  expect(m.enviados[0]).toContain('Cambio de planes')

  // 5. Otra alerta enseguida: no se le satura (máximo una cada 2 minutos).
  m.alerta = JSON.stringify({ t: 222, mensaje: 'Otra' })
  await clock.advance(15000)
  expect(m.enviados.length).toBe(1)

  // 6. Pasados 2 minutos, una tarea nueva para él también lo pone a trabajar.
  await clock.advance(120000)
  m.tareasMain['integrante-1-01-mapa'] = 'estado: pendiente\n# Mapa\n## Listo cuando\n- [ ] mapa\n'
  await clock.advance(15000)
  expect(m.enviados.length).toBe(2)
  expect(m.enviados[1]).toContain('Tienes tareas nuevas')
  await ui.unmount()
})
