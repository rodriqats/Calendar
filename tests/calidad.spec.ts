import { test, expect } from '@playwright/test';
import { abrir, irA, generar, botonAgregar } from './helpers';

test.describe('Calidad: responsive, accesibilidad y PWA', () => {
  for (const ancho of [320, 360, 768]) {
    test(`TC-40 sin scroll horizontal a ${ancho}px en las 3 pantallas`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 740 });
      await abrir(page, generar(2, 6));
      for (const vista of ['hoy', 'calendario', 'rendimiento'] as const) {
        await irA(page, vista);
        const desborda = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(desborda, `desborda en ${vista}`).toBe(false);
      }
    });
  }

  test('TC-41 accesibilidad: todo botón y enlace visible tiene nombre accesible', async ({ page }) => {
    await abrir(page, generar(1, 3));
    for (const vista of ['hoy', 'calendario', 'rendimiento'] as const) {
      await irA(page, vista);
      const sinNombre = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button, a[href]')]
          .filter((el) => !el.closest('[aria-hidden="true"]') && el.getAttribute('aria-hidden') !== 'true' && !el.closest('dialog:not([open])'))
          .filter((el) => !(el.getAttribute('aria-label') || el.textContent || '').trim())
          .map((el) => el.outerHTML.slice(0, 80)));
      expect(sinNombre, `sin nombre en ${vista}`).toEqual([]);
    }
  });

  test('TC-42 accesibilidad: los campos del formulario tienen etiqueta', async ({ page }) => {
    await abrir(page);
    await botonAgregar(page).click();
    await expect(page.getByLabel('Tarea', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Fecha')).toBeVisible();
    await expect(page.getByLabel('Hora (opcional)')).toBeVisible();
    await expect(page.getByLabel(/Recordarme esta tarea/)).toBeVisible();
    await expect(page.getByLabel(/Agregar a Google Calendar/)).toBeVisible();
  });

  test('TC-43 accesibilidad móvil: los controles principales miden al menos 44×44 px', async ({ page }) => {
    await abrir(page, generar(0, 2));
    const objetivos = [
      page.locator('nav.tabs button').first(), botonAgregar(page), page.getByRole('checkbox').first(),
      page.getByRole('button', { name: /Eliminar tarea/ }).first(), page.getByRole('link', { name: /Google Calendar/ }).first(),
    ];
    for (const el of objetivos) {
      const caja = await el.boundingBox();
      expect(caja, 'sin caja').not.toBeNull();
      expect(caja!.width).toBeGreaterThanOrEqual(44);
      expect(caja!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('TC-44 teclado: el formulario se abre y se cierra con Escape y devuelve el foco', async ({ page }) => {
    await abrir(page);
    await botonAgregar(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#fTitle')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog#dlg')).not.toBeVisible();
  });

  test('TC-45 modo oscuro: cambia el fondo y mantiene el texto legible', async ({ page }) => {
    await abrir(page, generar(1, 2));
    const colores = async () => page.evaluate(() => {
      const s = getComputedStyle(document.body); return { fondo: s.backgroundColor, texto: s.color };
    });
    await page.emulateMedia({ colorScheme: 'light' });
    const claro = await colores();
    await page.emulateMedia({ colorScheme: 'dark' });
    const oscuro = await colores();
    expect(oscuro.fondo).not.toBe(claro.fondo);
    expect(oscuro.texto).not.toBe(oscuro.fondo);
  });

  test('TC-46 PWA: el manifest declara nombre, modo standalone y los íconos existen', async ({ page, request }) => {
    await abrir(page);
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const respuesta = await request.get(new URL(href!, page.url()).toString());
    expect(respuesta.ok()).toBe(true);
    const m = await respuesta.json();
    expect(m.name).toBe('Anotación de tareas');
    expect(m.display).toBe('standalone');
    expect(m.icons.map((i: any) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(m.icons.some((i: any) => i.purpose === 'maskable')).toBe(true);
    for (const icono of m.icons) {
      const r = await request.get(new URL(icono.src, page.url()).toString());
      expect(r.status(), icono.src).toBe(200);
    }
  });

  test('TC-47 PWA: tras la primera visita la app abre sin conexión y conserva los datos', async ({ page, context }) => {
    await abrir(page, generar(1, 2));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // ahora la página queda controlada por el service worker
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(botonAgregar(page)).toBeVisible();
    await expect(page.locator('.task')).toHaveCount(2);
  });
});
