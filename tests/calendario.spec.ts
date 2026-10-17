import { test, expect } from '@playwright/test';
import { abrir, agregarTarea, irA, tarea, HOY } from './helpers';

test.describe('Calendario propio y Google Calendar', () => {
  test('TC-20 un día con tareas muestra marca y al tocarlo lista sus tareas', async ({ page }) => {
    await abrir(page, [tarea('1', 'Dentista', '2026-10-20', false, '10:30')]);
    await irA(page, 'calendario');
    const dia = page.locator('[data-date="2026-10-20"]');
    await expect(dia).toHaveAttribute('aria-label', '20 de octubre, 1 tarea');
    await expect(dia.locator('.dot:not(.none)')).toHaveCount(1);
    await dia.click();
    await expect(page.locator('.task .name')).toHaveText('Dentista');
  });

  test('TC-21 anotar una tarea a futuro desde el calendario y recuperarla tras recargar', async ({ page }) => {
    await abrir(page);
    await irA(page, 'calendario');
    await agregarTarea(page, { titulo: 'Reunión de cliente', fecha: '2026-10-29', hora: '15:00' });
    await page.reload();
    await irA(page, 'calendario');
    await page.locator('[data-date="2026-10-29"]').click();
    await expect(page.locator('.task .name')).toHaveText('Reunión de cliente');
    await expect(page.locator('.task .meta')).toContainText('15:00');
  });

  test('TC-22 frontera de año: noviembre, diciembre y enero cambian el encabezado', async ({ page }) => {
    await abrir(page);
    await irA(page, 'calendario');
    const titulo = page.locator('.cal-head h2');
    await expect(titulo).toHaveText('octubre 2026');
    for (const esperado of ['noviembre 2026', 'diciembre 2026', 'enero 2027']) {
      await page.getByRole('button', { name: 'Mes siguiente' }).click();
      await expect(titulo).toHaveText(esperado);
    }
    await page.getByRole('button', { name: 'Mes anterior' }).click();
    await expect(titulo).toHaveText('diciembre 2026');
  });

  test('TC-23 valor límite: febrero de un año bisiesto (2028) tiene 29 días', async ({ page }) => {
    await abrir(page);
    await irA(page, 'calendario');
    for (let i = 0; i < 16; i++) await page.getByRole('button', { name: 'Mes siguiente' }).click();
    await expect(page.locator('.cal-head h2')).toHaveText('febrero 2028');
    await expect(page.locator('.day[data-date]')).toHaveCount(29);
    await expect(page.locator('[data-date="2028-02-29"]')).toBeVisible();
  });

  test('TC-24 el enlace a Google Calendar de una tarea con hora dura 1 hora', async ({ page }) => {
    await abrir(page, [tarea('1', 'Reunión & café', HOY, false, '23:30')]);
    const href = await page.getByRole('link', { name: /Google Calendar: Reunión/ }).getAttribute('href');
    const url = new URL(href!);
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Reunión & café');
    expect(url.searchParams.get('dates')).toBe('20261014T233000/20261015T003000'); // cruza medianoche
    // Chromium informa la zona con el alias histórico "America/Buenos_Aires": se compara con lo que reporta el propio navegador.
    const zona = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(url.searchParams.get('ctz')).toBe(zona);
    expect(zona).toMatch(/Buenos_Aires$/);
  });

  test('TC-25 el enlace de una tarea sin hora es un evento de día completo', async ({ page }) => {
    await abrir(page, [tarea('1', 'Cumpleaños', '2026-10-31')]);
    await irA(page, 'calendario');
    await page.locator('[data-date="2026-10-31"]').click();
    const href = await page.getByRole('link', { name: /Google Calendar/ }).getAttribute('href');
    expect(new URL(href!).searchParams.get('dates')).toBe('20261031/20261101');
  });

  test('TC-26 guardar con "Agregar a Google Calendar" ofrece el enlace sin bloquearse', async ({ page }) => {
    await abrir(page);
    await agregarTarea(page, { titulo: 'Turno médico', hora: '08:00', gcal: true });
    const enlace = page.locator('#toast a');
    await expect(enlace).toHaveText('Abrir en Google Calendar');
    await expect(enlace).toHaveAttribute('target', '_blank');
    await expect(enlace).toHaveAttribute('rel', /noopener/);
  });
});
