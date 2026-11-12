import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'oficina',
  component: 'Pane',
  requestId: 'oficina',
  props: { title: 'Oficina Hackatec', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

test('el panel dibuja la oficina en desktop y la lista en terminal', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ key: 'opciones' })).toBeDefined()
    expect(await ui.find({ key: 'dia' })).toBeUndefined() // escondido hasta abrir Opciones
    expect(await ui.find({ type: 'Text', text: /Todavía no hay tareas/ })).toBeDefined()
    if (surface === 'desktop') expect(JSON.stringify(await ui.drawn())).toContain('<svg')
    else expect(await ui.find({ type: 'Text', text: /Coordinación/ })).toBeDefined()
    await ui.unmount()
  }
})

test('modo pro cambia las mascotas por la lista', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'opciones' })
  await ui.press({ key: 'modo' })
  expect(JSON.stringify(await ui.drawn())).not.toContain('<svg')
  expect(await ui.find({ type: 'Text', text: /Coordinación/ })).toBeDefined()
  await ui.unmount()
})

test('cerrar el día y volver', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'opciones' })
  await ui.press({ key: 'dia' })
  expect((await ui.find({ key: 'dia' }))?.text).toBe('Volver')
  await ui.press({ key: 'dia' })
  expect((await ui.find({ key: 'dia' }))?.text).toBe('Cerrar el día')
  await ui.unmount()
})
