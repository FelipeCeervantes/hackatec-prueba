export type Miembro = { nombre: string; rol: string }
export type Progreso = { hechos: number; total: number; estimado: number; inicio: number; titulo: string }
export type Tarea = Progreso & { archivo: string; rol: string; estado: string }
export type Personaje = { color?: string; accesorio?: string }
export type Equipo = {
  yo: Miembro
  equipo: Miembro[]
  ultimo: Record<string, number>
  bloqueados: string[]
  progreso: Record<string, Progreso>
  personajes: Record<string, Personaje>
  tareas: Tarea[]
}
export type Yo = { estado: string; t: number }
export type Anim = { rol: string; start: number }
export type Aviso = { t: number; texto: string }
export type Escena = { tipo: 'luna' | 'adios' | 'fiesta' | 'alerta'; start: number; mensaje?: string; auto?: boolean }
export type Vista = {
  modo: 'oficina' | 'pro'
  tam: 'chico' | 'mediano' | 'grande'
  panel: '' | 'menu' | 'alerta' | 'personaje' | 'desinstalar'
}

declare module 'claude-code' {
  interface PluginState {
    oficina: {
      yo: Yo
      equipo: Equipo
      anims: Anim[]
      escena: Escena | null
      vista: Vista
      guia: number
      tick: number
      actividad: Aviso[]
    }
  }
}
