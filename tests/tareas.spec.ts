import { test, expect } from '@playwright/test';
import { abrir, agregarTarea, botonAgregar, tarea, HOY, STORAGE_KEY } from './helpers';

test.describe('Tareas del día', () => {
  test('TC-01 agregar una tarea la muestra en Hoy con 0% de avance', async ({ page }) => {
    await abrir(page);
    await agregarTarea(page, { titulo: 'Ir al gimnasio' });
    await expect(page.locator('.task .name')).toHaveText('Ir al gimnasio');
    await expect(page.getByText('0 de 1 tareas cumplidas hoy')).toBeVisible();
  });

  test('TC-02 negativo: sin título no se crea la tarea y se explica el error', async ({ page }) => {
    await abrir(page);
    await botonAgregar(page).click();
    await page.getByRole('button', { name: 'Guardar tarea' }).click();
    await expect(page.locator('#fErr')).toHaveText('Escribí el nombre de la tarea.');
    await expect(page.locator('#fTitle')).toBeFocused();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.locator('.task')).toHaveCount(0);
  });

  test('TC-03 negativo: un título de solo espacios se rechaza', async ({ page }) => {
    await abrir(page);
    await botonAgregar(page).click();
    await page.locator('#fTitle').fill('     ');
    await page.getByRole('button', { name: 'Guardar tarea' }).click();
    await expect(page.locator('#fErr')).toContainText('nombre de la tarea');
  });

  test('TC-04 negativo: el recordatorio exige una hora', async ({ page }) => {
    await abrir(page);
    await botonAgregar(page).click();
    await page.locator('#fTitle').fill('Tomar la medicación');
    await page.locator('#fRemind').check();
    await page.getByRole('button', { name: 'Guardar tarea' }).click();
    await expect(page.locator('#fErr')).toContainText('elegí una hora');
    await expect(page.locator('.task')).toHaveCount(0);
  });

  test('TC-05 valor límite: el título admite 100 caracteres y no más', async ({ page }) => {
    await abrir(page);
    await botonAgregar(page).click();
    await page.locator('#fTitle').pressSequentially('a'.repeat(101));
    await expect(page.locator('#fTitle')).toHaveValue('a'.repeat(100));
    await page.getByRole('button', { name: 'Guardar tarea' }).click();
    await expect(page.locator('.task .name')).toHaveText('a'.repeat(100));
  });

  test('TC-06 seguridad: el HTML escrito en el título se muestra como texto y no se ejecuta', async ({ page }) => {
    await abrir(page);
    const payload = '<img src=x onerror="window.__xss=1"><b>negrita</b>';
    await agregarTarea(page, { titulo: payload });
    await expect(page.locator('.task .name')).toHaveText(payload);
    await expect(page.locator('.task .name img, .task .name b')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  });

  test('TC-07 marcar como cumplida cambia el estado y el porcentaje', async ({ page }) => {
    await abrir(page, [tarea('1', 'Leer'), tarea('2', 'Caminar')]);
    await page.getByRole('checkbox', { name: /Leer/ }).click();
    await expect(page.getByRole('checkbox', { name: /Leer/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.task.done')).toHaveCount(1);
    await expect(page.getByText('1 de 2 tareas cumplidas hoy')).toBeVisible();
    await expect(page.locator('.mini b')).toHaveText('50%');
  });

  test('TC-08 eliminar pide confirmación y la tarea desaparece', async ({ page }) => {
    await abrir(page, [tarea('1', 'Borrar esto')]);
    await page.getByRole('button', { name: 'Eliminar tarea: Borrar esto' }).click();
    await expect(page.locator('.task')).toHaveCount(1); // primer toque solo pide confirmar
    await page.getByRole('button', { name: 'Confirmar eliminar: Borrar esto' }).click();
    await expect(page.locator('.task')).toHaveCount(0);
    await expect(page.getByText('No hay tareas para este día.')).toBeVisible();
  });

  test('TC-09 persistencia: las tareas y su estado sobreviven a una recarga', async ({ page }) => {
    await abrir(page);
    await agregarTarea(page, { titulo: 'Estudiar', hora: '09:00' });
    await page.getByRole('checkbox', { name: /Estudiar/ }).click();
    await page.reload();
    await expect(page.locator('.task .name')).toHaveText('Estudiar');
    await expect(page.locator('.task.done')).toHaveCount(1);
    await expect(page.locator('.task .meta')).toContainText('09:00');
  });

  test('TC-10 las tareas se ordenan por hora y las que no tienen hora van al final', async ({ page }) => {
    await abrir(page, [
      tarea('1', 'Sin hora'), tarea('2', 'Tarde', HOY, false, '18:00'), tarea('3', 'Temprano', HOY, false, '07:30'),
    ]);
    await expect(page.locator('.task .name')).toHaveText(['Temprano', 'Tarde', 'Sin hora']);
  });

  test('TC-11 robustez: datos corruptos en el almacenamiento no rompen la app', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await abrir(page);
    await page.evaluate((k) => localStorage.setItem(k, '{esto no es json'), STORAGE_KEY);
    await page.reload();
    await expect(botonAgregar(page)).toBeVisible();
    await expect(page.locator('.task')).toHaveCount(0);
    expect(errores).toEqual([]);
  });

  test('TC-12 robustez: registros inválidos dentro de la lista se ignoran sin romper la app', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await abrir(page);
    await page.evaluate(
      ([k, hoy]) => localStorage.setItem(k, JSON.stringify([null, 7, { title: 'sin fecha' },
        { id: 'ok', title: 'Válida', date: hoy, time: '', done: false, remind: false, notified: false }])),
      [STORAGE_KEY, HOY] as const,
    );
    await page.reload();
    await expect(page.locator('.task .name')).toHaveText('Válida');
    expect(errores).toEqual([]);
  });
});
