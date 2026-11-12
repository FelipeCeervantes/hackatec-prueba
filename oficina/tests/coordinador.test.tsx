import { expect, test } from 'claude-code/testing'
import { nuevoMundo, PANE, simular } from './simulador'

test('coordinador: la alerta y las tareas nuevas nunca lo ponen a trabajar solo', async ($, on) => {
  const m = nuevoMundo({ identidad: 'Soy Felipe. Mi rol es coordinador.' })
  const clock = simular(on, m)
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  m.alerta = JSON.stringify({ t: 333, mensaje: 'Junta' })
  m.tareasMain['coordinador-01-revisar'] = 'estado: pendiente\n# Revisar\n'
  await clock.advance(15000)
  expect(m.enviados.length).toBe(0)

  // Y sí ve la escena de alerta en su oficina (el letrero sale a los 3.5 s).
  await clock.advance(4000)
  expect(JSON.stringify(await ui.drawn())).toContain('ALERTA')
  await ui.unmount()
})
