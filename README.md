# SportBook — Frontend

Frontend de **SportBook**, una aplicación web para gestionar reservas de canchas
deportivas dentro de un complejo (canchas, horarios, reservas, equipamiento,
eventos y pagos).

Trabajo Práctico de la cátedra **Desarrollo de Software** (UTN).

Este proyecto es independiente del backend: se comunica con él únicamente a
través de una API REST en JSON. El backend vive en su propio repositorio,
[SportBook-BackEnd](https://github.com/juanifaccio/SportBook-BackEnd).

## Tecnologías

- [Angular](https://angular.dev) 22 (componentes standalone y signals)
- TypeScript
- [Angular Material](https://material.angular.dev) 22 (Material 3)
- [Vitest](https://vitest.dev) para los tests unitarios
- [Playwright](https://playwright.dev) para los tests end-to-end

## Requisitos previos

- **Node.js 22.22.3 o superior** y **npm 10 o superior**. El mínimo lo pone
  Angular 22, que admite `^22.22.3 || ^24.15.0 || >=26.0.0`: con Node 20 el CLI
  se niega a compilar. El proyecto se desarrolla sobre el **LTS 24**, que es lo
  recomendable si estás instalando de cero. Verificalo con:

  ```bash
  node --version
  ```

- El **backend de SportBook ejecutándose**, junto con su base de datos MySQL. Sin
  él la aplicación levanta igual, pero muestra un mensaje de error en cada
  pantalla que necesite datos. Las instrucciones para levantarlo están en el
  README de su repositorio.

  Los **tests no lo necesitan**: ni los unitarios ni los end-to-end. Ver
  [Tests](#tests).

## Instalación

Cloná el repositorio e instalá las dependencias:

```bash
npm install
```

## Ejecución

Para levantar el servidor de desarrollo:

```bash
npm start
```

Abrí `http://localhost:4200/` en el navegador. La aplicación se recarga sola
cada vez que modificás un archivo del código fuente.

La primera pantalla es la de **inicio de sesión**: la API pide sesión en todos
sus endpoints. Si es la primera vez que levantás el proyecto, creá el
administrador inicial con `npm run seed` en el backend (ver su README) y entrá
con el email y la contraseña que pusiste ahí. El resto de las cuentas se dan de
alta desde la pantalla de usuarios.

## Otros comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en `http://localhost:4200/` |
| `npm run build` | Compila para producción en `dist/` |
| `npm run watch` | Compila en modo desarrollo y recompila ante cada cambio |
| `npm test` | Tests unitarios con Vitest |
| `npm run e2e` | Tests end-to-end con Playwright |
| `npm run e2e:ui` | Los mismos, en el modo interactivo de Playwright |
| `npm run e2e:reporte` | Abre el informe HTML de la última corrida |
| `npm run start:e2e` | Servidor de desarrollo con el ambiente de los e2e, en el 4300 |

## Tests

Dos suites, que prueban cosas distintas y se corren por separado.

### Unitarios (`npm test`)

**257 tests con Vitest**: el servicio, el componente y el diálogo de cada CRUD,
más el adaptador de fechas, la sesión, el interceptor de errores, los guards, el
login y el perfil propio. Se ejecutan sobre el DOM simulado de jsdom, sin
navegador.

### End-to-end (`npm run e2e`)

**109 tests con Playwright**: levantan la aplicación de verdad con `ng serve` y la
manejan desde un navegador como lo haría una persona. Recorren los flujos
completos —entrar, reservar un turno, cancelarlo y ver que vuelva a ofrecerse—
sobre el bundle real, con el router, los guards y los diálogos de Material.

La primera vez hay que bajar el navegador que usa Playwright:

```bash
npx playwright install chromium
```

Después alcanza con:

```bash
npm run e2e
```

No hace falta levantar nada a mano: Playwright arranca el servidor de desarrollo
en el puerto 4300 y lo apaga al terminar.

**El backend no interviene.** `e2e/apoyo/api-falsa.ts` intercepta lo que la
aplicación le pide a `/api` y lo responde desde un estado en memoria,
reproduciendo el contrato real: los mismos códigos HTTP, los mismos mensajes en
español y las mismas reglas de negocio. No es un stub de listas fijas —guarda lo
que se crea, se edita y se borra—, así que los recorridos se pueden seguir de
punta a punta.

Es a propósito: los dos proyectos son independientes y agnósticos entre sí, así
que los tests del frontend no pueden exigir el repositorio del backend ni una
base MySQL para correr. Lo que solo se ve al juntar las dos piezas ya lo cubren
los tests de integración del backend, que le pegan por HTTP a la API entera.

```
e2e/
  apoyo/
    datos.ts        datos con los que arranca cada test
    api-falsa.ts    el backend simulado dentro del navegador
    fixtures.ts     la API ya enganchada, más ayudas de Material
  login.spec.ts             entrar, salir y la sesión que sobrevive a recargar
  niveles-de-acceso.spec.ts qué ve y a dónde entra cada rol
  navegacion.spec.ts        ruteo, títulos, 404 y menú lateral responsive
  tipo-cancha.spec.ts       el ABM de referencia, de punta a punta
  horario.spec.ts           los turnos de una cancha y la generación en lote
  reservar.spec.ts          el caso de uso central
  gestion-reservas.spec.ts  listar, filtrar, reprogramar y cancelar
  evento.spec.ts            el evento de una reserva, con los dos roles
  perfil.spec.ts            la cuenta propia: datos y contraseña
  pago.spec.ts              cobrar una reserva, anular y el saldo
```

Cuando algo falla, el informe con capturas y trazas queda en `playwright-report/`:

```bash
npm run e2e:reporte
```

## Conexión con el backend

La URL de la API **no está escrita en el código**: sale de los archivos de
ambiente, en `src/environments/`.

- `environment.ts` — desarrollo. Apunta a `http://localhost:3000/api`, que es
  donde escucha el backend por defecto.
- `environment.production.ts` — producción. Apunta a `/api`, asumiendo que el
  frontend se sirve detrás del mismo dominio que la API.
- `environment.e2e.ts` — tests end-to-end. También `/api`: la API la responde el
  navegador, y con un solo origen no hay CORS de por medio.

Si tu backend corre en otro puerto o en otra máquina, cambiá `apiUrl` en
`src/environments/environment.ts`. El build de producción reemplaza ese archivo
por el de producción automáticamente (`fileReplacements` en `angular.json`).

## Estructura del proyecto

```
src/
  environments/            configuración por ambiente (URL de la API)
  material-theme.scss      tema de Angular Material (colores, tipografía)
  styles.css               estilos globales y breakpoints de la app
  app/
    core/                  piezas transversales
      breakpoints.ts         breakpoints SM / MD / LG
      guards/                quién puede entrar a cada ruta
      interceptors/          token de la sesión y manejo de errores HTTP
      services/              sesión (AuthService) y notificaciones (snackbars)
      testing/               sesiones armadas para los tests
    models/                interfaces del dominio (una por entidad)
    services/              acceso a la API (un servicio por recurso)
    components/
      layout/                barra superior y menú de navegación
      login/                 inicio de sesión (única pantalla fuera del layout)
      shared/                componentes reutilizables (diálogo de confirmación)
      tipo-cancha/           ABM de tipos de cancha
      evento/                ABM del evento de una reserva
      perfil/                la cuenta propia de quien está conectado
      pago/                  lo cobrado por cada reserva
      no-encontrado/         pantalla 404
    app.routes.ts          rutas de la aplicación (con lazy loading)
    app.config.ts          providers de la aplicación
```

`components/tipo-cancha/` es la **implementación de referencia**: el resto de las
entidades del dominio se construyen replicando esa estructura (modelo, servicio,
listado con estados de carga/vacío/error y diálogo de formulario reutilizable).

## Niveles de acceso

La sesión se guarda en el navegador (token y usuario), así que recargar la página
no obliga a volver a entrar. Al arrancar, la aplicación revalida esa sesión
contra el backend: si venció o la cuenta cambió, se cierra sola.

Los dos roles del backend definen qué ofrece la aplicación:

| | `ADMIN` | `CLIENTE` |
|---|---|---|
| Reservar | Sí, a nombre de cualquier usuario | Sí, a su propio nombre |
| Reservas | Todas las del complejo | Solo las suyas |
| Eventos | Todos los del complejo | Solo los de sus reservas |
| Pagos | Registra, corrige y anula | Solo ve los de sus reservas |
| Canchas, horarios, usuarios y tipos | Sí | No aparecen en el menú |
| Su propio perfil | Sí | Sí |

Esconder lo que un rol no puede usar es para no hacerle perder el tiempo, no para
protegerlo: quien escriba la URL a mano se topa con el guard primero y con el
backend después, que es donde se decide de verdad.

## Diseño responsive

El CSS se escribe **mobile-first**: el estilo base corresponde a pantalla chica y
las media queries solo agregan reglas hacia arriba. Los tres breakpoints son:

| Breakpoint | Ancho mínimo | Comportamiento |
|---|---|---|
| SM | 600 px | Listados en tarjetas, dos por fila |
| MD | 960 px | Menú lateral fijo, listados en tabla |
| LG | 1280 px | Mismo layout que MD, con más espaciado |
