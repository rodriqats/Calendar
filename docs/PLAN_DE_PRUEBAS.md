# Plan de pruebas – Anotación de tareas

## 1. Alcance
App web móvil de una sola página (HTML/CSS/JS, sin backend). Se prueba por la interfaz, como lo haría una persona. Con fecha congelada: **miércoles 14/10/2026** y zona horaria Buenos Aires.

Fuera de alcance: pruebas de API, base de datos y rendimiento con JMeter, porque la app no tiene backend.

## 2. Estrategia
- E2E con Playwright + TypeScript, dos perfiles: **móvil** (Pixel 5) y **escritorio** (Chrome).
- Datos de prueba sembrados en localStorage para llegar al estado deseado sin pasos innecesarios.
- Se priorizó lo que el criterio de aceptación exige (porcentajes y mensajes) y lo que más rompe una app móvil (anchos angostos, datos guardados, sin conexión).

## 3. Casos de prueba
| ID | Tipo | Qué verifica |
|---|---|---|
| TC-01 | Funcional | Agregar tarea la muestra en Hoy con 0 % |
| TC-02 | Negativo | Sin título no se crea la tarea; mensaje de error y foco en el campo |
| TC-03 | Negativo | Título de solo espacios se rechaza |
| TC-04 | Negativo | El recordatorio exige hora |
| TC-05 | Valor límite | Título de 100 caracteres sí, 101 no |
| TC-06 | Seguridad | HTML en el título se muestra como texto y no se ejecuta |
| TC-07 | Funcional | Marcar cumplida actualiza estado y porcentaje |
| TC-08 | Funcional | Eliminar pide confirmación |
| TC-09 | Persistencia | Tareas y estado sobreviven a la recarga |
| TC-10 | Funcional | Orden por hora; sin hora al final |
| TC-11 | Robustez | Datos guardados que no son JSON no rompen la app |
| TC-12 | Robustez | Registros inválidos dentro de la lista se ignoran |
| TC-20 | Funcional | Día con tareas: marca, etiqueta accesible y lista al tocarlo |
| TC-21 | Persistencia | Tarea a futuro anotada desde el calendario se recupera tras recargar |
| TC-22 | Valor límite | Cambio de año (nov → dic → ene) |
| TC-23 | Valor límite | Febrero bisiesto 2028 tiene 29 días |
| TC-24 | Funcional | Enlace a Google Calendar con hora: dura 1 h, cruza medianoche, caracteres especiales |
| TC-25 | Funcional | Enlace sin hora: evento de día completo |
| TC-26 | Funcional | Guardar con "Agregar a Google Calendar" ofrece el enlace |
| TC-30 (×12) | Valor límite | 100, 99, 90, 70, 69, 60, 40, 39, 30, 0 %, más 199/200 (99,5 %) y 2/3 (66,6 %) |
| TC-31 | Funcional | Sin tareas: mensaje neutro y 0 % |
| TC-32 | Funcional | Tareas futuras no bajan el porcentaje |
| TC-33 | Funcional | Períodos Hoy / Semana / Mes / Total sobre el rango correcto |
| TC-34 | Integración | Cumplir tareas en Hoy actualiza Rendimiento |
| TC-35 | Funcional | Gráfico de 7 días |
| TC-36 | Visual | Día sin tareas dibuja barra mínima, no un bloque |
| TC-40 (×3) | Responsive | Sin scroll horizontal a 320, 360 y 768 px en las 3 pantallas |
| TC-41 | Accesibilidad | Botones y enlaces con nombre accesible |
| TC-42 | Accesibilidad | Campos del formulario con etiqueta |
| TC-43 | Accesibilidad | Controles principales de al menos 44×44 px |
| TC-44 | Accesibilidad | Teclado: abrir formulario con Enter y cerrar con Escape |
| TC-45 | Funcional | Modo oscuro cambia el fondo y mantiene el texto distinto del fondo |
| TC-46 | PWA | Manifest válido e íconos existentes |
| TC-47 | PWA | Abre sin conexión y conserva los datos |

## 4. Resultados
Última ejecución completa: **94 de 94 aprobadas** (47 casos × 2 perfiles), Playwright 1.56, Chromium. Una corrida anterior de 92 pruebas repetida dos veces (184 de 184) no mostró pruebas inestables.

## 5. Defectos encontrados y corregidos
Defectos **comprobados** por una prueba que falló antes de la corrección y pasa después.

| ID | Severidad | Descripción | Detectado por | Corrección |
|---|---|---|---|---|
| BUG-01 | Media | En celulares de hasta ~360 px el calendario se salía de su tarjeta y generaba scroll horizontal: las 7 columnas exigían 44 px mínimo cada una. | TC-40 | Columnas flexibles (`minmax(0,1fr)`) y menos relleno en la tarjeta del calendario. |
| BUG-02 | Media | Un registro inválido en el almacenamiento (por ejemplo `null`) provocaba un error de JavaScript y la app quedaba en blanco. Requiere datos manipulados o de una versión anterior. | TC-12 | Al cargar se descartan los registros inválidos y se normalizan los válidos. |
| BUG-03 | Baja | En el gráfico de 7 días, los días sin tareas se dibujaban como bloques grises de 56 px por una colisión de clase CSS (`.empty`). | Revisión visual de una captura; luego TC-36 | Se renombró la clase del gráfico. |

## 6. Decisiones sobre el pedido original
- El pedido definía 100 %, 90–70 %, 69–40 % y 39–0 %: **91–99 % no tenía mensaje**. Se asignó "Casi logramos hacer todo…".
- Los porcentajes se **truncan**, no se redondean (99,5 % se muestra como 99 %): el 100 % solo aparece si se cumplió todo.
- Las tareas con fecha futura **no cuentan** en el porcentaje hasta que llega su día.

## 7. Riesgos potenciales (no verificados)
No son defectos comprobados; no se pudieron o no se quisieron verificar.

- **Navegadores:** solo se probó en Chromium. Safari/iOS y Firefox pueden diferir (campos de fecha y hora, `<dialog>`).
- **Accesibilidad:** no se corrió una auditoría automática con axe, el contraste no se midió formalmente y no se probó con lector de pantalla.
- **Varias pestañas:** con dos pestañas abiertas a la vez, cada una guarda su propia copia y la última en guardar pisa a la otra.
- **Notificaciones:** solo avisan con la app abierta y no se probaron en dispositivos reales.
- **Google Calendar:** se valida el formato del enlace, pero no se abrió contra Google.
- **Fechas y zonas horarias:** solo con zona Buenos Aires (sin horario de verano) y fecha congelada.
- **Privacidad:** los datos quedan sin cifrar en el dispositivo y no hay cuentas. Adecuado para una demo; no guardar información sensible.

## 8. Cómo ejecutar
```bash
npm install
npx playwright install chromium
npm test
npm run report
```
