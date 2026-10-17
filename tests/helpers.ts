import { expect, type Page } from '@playwright/test';

/** Fecha congelada de las pruebas: miércoles 14/10/2026 (semana: lun 12 – dom 18). */
export const HOY = '2026-10-14';
export const STORAGE_KEY = 'anotacion-tareas-v1';

export type Tarea = {
  id: string; title: string; date: string; time: string;
  done: boolean; remind: boolean; notified: boolean;
};

export const tarea = (id: string, title: string, date = HOY, done = false, time = ''): Tarea =>
  ({ id, title, date, time, done, remind: false, notified: false });

/** `total` tareas en `fecha`, de las cuales `hechas` están cumplidas. */
export const generar = (hechas: number, total: number, fecha = HOY): Tarea[] =>
  Array.from({ length: total }, (_, i) => tarea(`g${i}`, `Tarea ${i + 1}`, fecha, i < hechas));

/** Abre la app con la fecha congelada. Si se pasan tareas, las deja guardadas antes de cargar. */
export async function abrir(page: Page, tareas?: Tarea[]) {
  await page.clock.setFixedTime(new Date(`${HOY}T15:00:00Z`));
  await page.goto('/');
  if (tareas) {
    await page.evaluate(([k, t]) => localStorage.setItem(k as string, JSON.stringify(t)), [STORAGE_KEY, tareas] as const);
    await page.reload();
  }
  await expect(page.getByRole('heading', { name: 'Anotación de tareas' })).toBeVisible();
}

export const irA = (page: Page, vista: 'hoy' | 'calendario' | 'rendimiento') =>
  page.locator(`nav.tabs button[data-view="${vista}"]`).click();

export const botonAgregar = (page: Page) => page.getByRole('button', { name: 'Agregar nueva tarea' });

export async function agregarTarea(
  page: Page,
  o: { titulo: string; fecha?: string; hora?: string; recordar?: boolean; gcal?: boolean },
) {
  await botonAgregar(page).click();
  await page.locator('#fTitle').fill(o.titulo);
  if (o.fecha) await page.locator('#fDate').fill(o.fecha);
  if (o.hora) await page.locator('#fTime').fill(o.hora);
  if (o.recordar) await page.locator('#fRemind').check();
  if (o.gcal) await page.locator('#fGcal').check();
  await page.getByRole('button', { name: 'Guardar tarea' }).click();
}

export const mensajeRendimiento = (page: Page) => page.locator('#perfMsg');
export const porcentajeAnillo = (page: Page) => page.locator('.ring .num');
