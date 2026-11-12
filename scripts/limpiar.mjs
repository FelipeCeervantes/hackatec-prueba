// Quita la oficina de esta laptop sin dejar basura.
// Uso: node scripts/limpiar.mjs          -> plugin, marketplace, caché, índices y datos de la oficina
//      node scripts/limpiar.mjs --todo   -> además borra CLAUDE.local.md (tu nombre y rol en esta carpeta)
// La carpeta del repo no se borra aquí: eso lo decide la persona.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const mk = JSON.parse(fs.readFileSync(path.join(raiz, '.claude-plugin', 'marketplace.json'), 'utf8')).name
const id = `oficina@${mk}`
const hecho = []

// 1. Con el CLI de Claude, si está disponible (no toca .claude/settings.json, que es del repo).
const claude = (...args) => { try { execFileSync('claude', args, { cwd: raiz, stdio: 'ignore', timeout: 60000 }); return true } catch { return false } }
for (const scope of ['local', 'user']) if (claude('plugin', 'uninstall', id, '--scope', scope)) hecho.push(`plugin quitado (${scope})`)
if (claude('plugin', 'marketplace', 'remove', mk)) hecho.push('marketplace quitado')

// 2. Lo que el CLI deja o lo que haya sin CLI: carpetas, datos e índices en ~/.claude/plugins.
const plugins = path.join(os.homedir(), '.claude', 'plugins')
const borrar = p => { if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); hecho.push(`borrado ${path.relative(os.homedir(), p)}`) } }
for (const sub of ['cache', 'marketplaces']) borrar(path.join(plugins, sub, mk))
for (const sub of ['store', 'data']) {
  const dir = path.join(plugins, sub)
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.startsWith('oficina') && f.includes(mk)) borrar(path.join(dir, f))
}
// Quita del JSON toda clave que nombre este marketplace o su plugin.
const sinMk = v => {
  if (Array.isArray(v)) return v.map(sinMk)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => k !== mk && !k.endsWith(`@${mk}`)).map(([k, x]) => [k, sinMk(x)]))
  return v
}
const limpiarJson = (p, extra) => {
  if (!fs.existsSync(p)) return
  const antes = fs.readFileSync(p, 'utf8')
  let j = sinMk(JSON.parse(antes))
  if (extra) j = extra(j)
  const despues = JSON.stringify(j, null, 2)
  if (despues !== JSON.stringify(JSON.parse(antes), null, 2)) { fs.writeFileSync(p, despues + '\n'); hecho.push(`limpiado ${path.basename(p)}`) }
}
limpiarJson(path.join(plugins, 'installed_plugins.json'))
limpiarJson(path.join(plugins, 'known_marketplaces.json'))

// 3. Esta carpeta: el repo pide la oficina en .claude/settings.json; la apagamos solo aquí para que no se reinstale.
limpiarJson(path.join(raiz, '.claude', 'settings.local.json'), j => ({ ...j, enabledPlugins: { ...(j.enabledPlugins || {}), [id]: false } }))
if (!fs.existsSync(path.join(raiz, '.claude', 'settings.local.json'))) {
  fs.writeFileSync(path.join(raiz, '.claude', 'settings.local.json'), JSON.stringify({ enabledPlugins: { [id]: false } }, null, 2) + '\n')
  hecho.push('oficina apagada en esta carpeta')
}
if (process.argv.includes('--todo')) borrar(path.join(raiz, 'CLAUDE.local.md'))

console.log(hecho.length ? hecho.map(h => `- ${h}`).join('\n') : 'No había nada que limpiar.')
