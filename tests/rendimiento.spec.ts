import { test, expect } from '@playwright/test';
import { abrir, irA, generar, tarea, mensajeRendimiento, porcentajeAnillo, HOY } from './helpers';

const OK = 'Logramos hacer todo, sigue así';
const CASI = 'Casi logramos hacer todo, pero es un gran avance';
const MEJORAR = 'Deberías mejorar la conducta';
const BORRAR = 'Borra esta app por que no te sirve';

test.describe('Rendimiento y mensajes', () => {
  // [hechas, total, % esperado, mensaje]  — incluye todos los límites de los rangos pedidos
  const casos: Array<[number, number, string, string]> = [
    [10, 10, '100%', OK],
    [99, 100, '99%', CASI],     // 91–99 no estaba definido en el pedido: se asume "Casi logramos"
    [9, 10, '90%', CASI],
    [7, 10, '70%', CASI],
    [69, 100, '69%', MEJORAR],
    [6, 10, '60%', MEJORAR],
    [40, 100, '40%', MEJORAR],
    [39, 100, '39%', BORRAR],
    [3, 10, '30%', BORRAR],
    [0, 10, '0%', BORRAR],
    [199, 200, '99%', CASI],    // 99,5 % no debe redondearse a 100
    [2, 3, '66%', MEJORAR],     // 66,6 % se trunca, no se redondea
  ];
  for (const [hechas, total, pct, mensaje] of casos) {
    test(`TC-30 ${hechas}/${total} → ${pct}`, async ({ page }) => {
      await abrir(page, generar(hechas, total));
      await irA(page, 'rendimiento');
      await expect(porcentajeAnillo(page)).toHaveText(pct);
      await expect(mensajeRendimiento(page)).toHaveText(mensaje);
    });
  }

  test('TC-31 sin tareas muestra un mensaje neutro y 0%', async ({ page }) => {
    await abrir(page);
    await irA(page, 'rendimiento');
    await expect(porcentajeAnillo(page)).toHaveText('0%');
    await expect(mensajeRendimiento(page)).toHaveText('Todavía no hay tareas para medir. ¡Agregá la primera!');
  });

  test('TC-32 las tareas futuras no bajan el porcentaje', async ({ page }) => {
    await abrir(page, [tarea('1', 'Hecha', HOY, true), tarea('2', 'Futura', '2026-10-20')]);
    await irA(page, 'rendimiento');
    await expect(porcentajeAnillo(page)).toHaveText('100%');
    await expect(mensajeRendimiento(page)).toHaveText(OK);
  });

  test('TC-33 los períodos Hoy, Semana, Mes y Total calculan sobre el rango correcto', async ({ page }) => {
    await abrir(page, [
      tarea('a', 'Hoy hecha', HOY, true), tarea('b', 'Hoy pendiente', HOY, false),
      tarea('c', 'Martes 1', '2026-10-13', true), tarea('d', 'Martes 2', '2026-10-13', true),
      tarea('e', 'Domingo anterior', '2026-10-11', false),   // semana pasada, mismo mes
      tarea('f', 'Mes anterior', '2026-09-30', false),
      tarea('g', 'Futura', '2026-10-20', false),             // no cuenta en ningún período
    ]);
    await irA(page, 'rendimiento');
    const esperado: Record<string, string> = { Hoy: '50%', Semana: '75%', Mes: '60%', Total: '50%' };
    for (const [periodo, pct] of Object.entries(esperado)) {
      await page.locator('.seg').getByRole('button', { name: periodo, exact: true }).click();
      await expect(porcentajeAnillo(page)).toHaveText(pct);
    }
  });

  test('TC-34 cumplir una tarea desde Hoy actualiza la pantalla de Rendimiento', async ({ page }) => {
    await abrir(page, generar(0, 4));
    await page.getByRole('checkbox', { name: /Tarea 1/ }).click();
    await page.getByRole('checkbox', { name: /Tarea 2/ }).click();
    await page.getByRole('checkbox', { name: /Tarea 3/ }).click();
    await irA(page, 'rendimiento');
    await expect(porcentajeAnillo(page)).toHaveText('75%');
    await expect(mensajeRendimiento(page)).toHaveText(CASI);
  });

  test('TC-35 el gráfico de 7 días marca el porcentaje de hoy y deja "–" en días sin tareas', async ({ page }) => {
    await abrir(page, [...generar(1, 2), tarea('x', 'Ayer', '2026-10-13', true)]);
    await irA(page, 'rendimiento');
    const porcentajes = await page.locator('.week .p').allTextContents();
    expect(porcentajes).toEqual(['–', '–', '–', '–', '–', '100%', '50%']);
  });

  test('TC-36 visual: un día sin tareas dibuja una barra mínima y no un bloque', async ({ page }) => {
    await abrir(page, generar(1, 2));
    await irA(page, 'rendimiento');
    const sinTareas = page.locator('.week .col', { has: page.locator('.p', { hasText: '–' }) });
    await expect(sinTareas).toHaveCount(6); // los 6 días anteriores a hoy
    const alturas = await sinTareas.locator('.b').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    for (const h of alturas) expect(h).toBeLessThanOrEqual(8);
    const hoy = await page.locator('.week .col').last().locator('.b').boundingBox();
    expect(hoy!.height).toBeGreaterThan(30);
  });
});
