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
- [Vitest](https://vitest.dev) para tests unitarios

## Requisitos previos

- **Node.js 20 o superior** y **npm 10 o superior**. Verificalo con:

  ```bash
  node --version
  ```

- El **backend de SportBook ejecutándose**, junto con su base de datos MySQL. Sin
  él la aplicación levanta igual, pero muestra un mensaje de error en cada
  pantalla que necesite datos. Las instrucciones para levantarlo están en el
  README de su repositorio.

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
| `npm test` | Ejecuta los tests unitarios con Vitest |

## Conexión con el backend

La URL de la API **no está escrita en el código**: sale de los archivos de
ambiente, en `src/environments/`.

- `environment.ts` — desarrollo. Apunta a `http://localhost:3000/api`, que es
  donde escucha el backend por defecto.
- `environment.production.ts` — producción. Apunta a `/api`, asumiendo que el
  frontend se sirve detrás del mismo dominio que la API.

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
| Canchas, horarios, usuarios y tipos | Sí | No aparecen en el menú |

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
