# SportBook Frontend

Frontend de **SportBook**, una aplicación web para gestionar reservas de canchas
deportivas dentro de un complejo (canchas, horarios, reservas, equipamiento,
eventos y pagos).

Trabajo Práctico de la cátedra **Desarrollo de Software** (UTN).

Este proyecto es independiente del backend: se comunica con él únicamente a
través de una API REST en JSON. El backend vive en su propio repositorio,
[SportBook-BackEnd](https://github.com/juanifaccio/SportBook-BackEnd).

## Cómo se instala SportBook

La aplicación son dos programas que corren al mismo tiempo, cada uno en su
terminal, más una base de datos:

```
Frontend (Angular)  ──HTTP/JSON──►  Backend (Express)  ──Prisma──►  MySQL
localhost:4200                      localhost:3000                  localhost:3306
```

El orden importa, porque cada pieza necesita la anterior:

1. Instalar y levantar el **backend** y su base de datos, siguiendo el
   [README de su repositorio](https://github.com/juanifaccio/SportBook-BackEnd#readme).
   **Si todavía no lo hiciste, empezá por ahí.**
2. Instalar y levantar **este frontend** ([Instalación paso a paso](#instalación-paso-a-paso)).
3. Entrar a la aplicación y cargar los datos básicos ([Primer uso](#primer-uso-cargar-datos-para-poder-reservar)).

Los comandos de esta guía son para **Windows** (PowerShell o el símbolo del
sistema), y son los mismos en macOS y Linux.

## Tecnologías

- [Angular](https://angular.dev) 22 (componentes standalone y signals)
- TypeScript
- [Angular Material](https://material.angular.dev) 22 (Material 3)

## Requisitos previos

- **Node.js 22.22.3 o superior** y **npm 10 o superior**. El mínimo lo pone
  Angular 22, que admite `^22.22.3 || ^24.15.0 || >=26.0.0`: con una versión
  anterior (por ejemplo Node 20) el proyecto no compila. Lo recomendable es el
  **LTS 24**, que se descarga de <https://nodejs.org> y es con el que se
  desarrolla el proyecto. Si ya lo instalaste para el backend, no hay que hacer
  nada. Verificalo con:

  ```bash
  node --version
  ```

- **Git**, para clonar el repositorio (<https://git-scm.com/downloads>).

- El **backend de SportBook corriendo** en `http://localhost:3000`, con su base de
  datos creada y el administrador inicial cargado. Sin él la aplicación abre
  igual, pero no se puede iniciar sesión.

> Después de instalar Node o Git, cerrá la terminal y abrí una nueva: Windows
> actualiza el `PATH` recién en las terminales nuevas. Y si PowerShell responde
> que *"la ejecución de scripts está deshabilitada"* al correr `npm`, ver
> [Problemas frecuentes](#problemas-frecuentes).

## Instalación paso a paso

### 1. Abrir una segunda terminal

La terminal donde corre el backend **queda ocupada y tiene que seguir abierta**.
Abrí otra para el frontend.

### 2. Descargar el proyecto

Ubicate en la carpeta donde quieras guardar el proyecto (puede ser la misma donde
clonaste el backend), cloná el repositorio y entrá a su carpeta:

```bash
git clone https://github.com/juanifaccio/SportBook-FrontEnd.git
```

```bash
cd SportBook-FrontEnd
```

Todos los comandos que siguen se corren **parado en esta carpeta**.

### 3. Instalar las dependencias

```bash
npm install
```

Es la instalación más pesada de las dos: puede tardar varios minutos la primera
vez. Al terminar aparece la carpeta `node_modules/`.

No hace falta instalar Angular aparte: el proyecto trae su propia copia del CLI
y `npm start` la usa.

### 4. Levantar la aplicación

```bash
npm start
```

La primera vez compila todo y tarda un poco. Está lista cuando la terminal
muestra `Local: http://localhost:4200/`. Igual que con el backend, **dejá esta
terminal abierta** mientras uses la aplicación (`Ctrl+C` la apaga).

> Si el backend no quedó en el puerto 3000 (porque le cambiaste `PORT` en su
> `.env`), antes de este paso hay que avisarle al frontend: ver
> [Conexión con el backend](#conexión-con-el-backend).

### 5. Entrar

Abrí <http://localhost:4200> en el navegador. La primera pantalla es la de
**inicio de sesión**: entrá con el `ADMIN_EMAIL` y el `ADMIN_CONTRASENA` que
pusiste en el `.env` del backend antes de correr su `npm run seed`.

## Primer uso: cargar datos para poder reservar

Recién instalada, la base tiene **solo tu usuario administrador**: no hay canchas
ni turnos, así que todavía no se puede reservar nada. Los datos se cargan desde
el menú lateral en este orden, porque cada uno depende del anterior:

| Orden | Pantalla del menú | Qué cargar | Por qué antes que el siguiente |
|---|---|---|---|
| 1 | **Tipos de cancha** | Fútbol 5, Pádel... | Una cancha necesita un tipo |
| 2 | **Canchas** | Cancha 1, con su tipo, su precio por hora y estado Disponible | Un turno necesita una cancha |
| 3 | **Horarios** | Los turnos de una cancha para un día | Solo se reservan turnos libres |
| 4 | **Usuarios** | Al menos un cliente (rol `CLIENTE`) | La reserva se hace a nombre de alguien |

En **Horarios** no hace falta cargar los turnos de a uno: el botón **Generar
turnos** pide cancha, fecha, hora de apertura, hora de cierre y duración de cada
turno, y crea todos los del rango de una vez. Cargá turnos para hoy o para un día
futuro: los que ya empezaron no se pueden reservar.

Opcionalmente, en **Tipos de evento** (cumpleaños, torneo...) y en
**Equipamiento** (pelotas, paletas...) se carga lo que después se puede sumar a
una reserva.

Con eso ya se puede recorrer el flujo completo:

1. **Reservar**: elegir cancha, día, turno libre y el usuario a cuyo nombre va la
   reserva, y confirmar.
2. **Reservas**: ver el listado, filtrarlo por cancha, día o estado, abrir el
   detalle de una reserva, reprogramarla a otro turno o cancelarla (lo que
   devuelve el turno a la lista de libres).

## Problemas frecuentes

**PowerShell no deja ejecutar `npm`** (*"No se puede cargar el archivo
...\npm.ps1 porque la ejecución de scripts está deshabilitada en este
sistema"*). Se resuelve una sola vez, habilitando los scripts para tu usuario:

```bash
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

La alternativa es usar el **símbolo del sistema** (`cmd`) en lugar de PowerShell.

**`The Angular CLI requires a minimum Node.js version of ...`.** La versión de
Node es vieja. Instalá el LTS 24 de <https://nodejs.org> y abrí una terminal
nueva.

**`'ng' no se reconoce como un comando`.** Faltó el `npm install` (paso 3), o se
corrió en otra carpeta. Comprobá que estás parado en `SportBook-FrontEnd`.

**`Port 4200 is already in use`.** Hay otra terminal con el frontend corriendo:
cerrala. Si no, se puede levantar en otro puerto:

```bash
npm start -- --port 4201
```

**"No se pudo conectar con el servidor. Verificá que el backend esté
ejecutándose."** El backend no está corriendo, o el frontend lo busca en otro
puerto. Comprobá que <http://localhost:3000> responda en el navegador, y si no,
volvé a levantarlo con `npm start` en su carpeta.

**"Email o contraseña incorrectos" al entrar.** Faltó correr `npm run seed` en el
backend, o los datos no son los que tenía su `.env` en ese momento. Ver los
problemas frecuentes del
[README del backend](https://github.com/juanifaccio/SportBook-BackEnd#problemas-frecuentes).

**En Reservar no aparece la cancha.** Solo se ofrecen las canchas en estado
**Disponible**: si la cargaste en mantenimiento, editala en **Canchas**.

**En Reservar no aparece ningún turno.** No hay turnos libres para esa cancha y
ese día. Generá turnos en **Horarios** (ver
[Primer uso](#primer-uso-cargar-datos-para-poder-reservar)).

## Las veces siguientes

Lo de arriba se hace una sola vez. Para volver a usar la aplicación otro día:

1. En una terminal, en la carpeta del backend: `npm start`.
2. En otra terminal, en la carpeta del frontend: `npm start`.
3. Abrir <http://localhost:4200>.

Si descargás cambios nuevos del repositorio (`git pull`), corré otra vez
`npm install` antes de `npm start`.

## Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias |
| `npm start` | Servidor de desarrollo en `http://localhost:4200/`, que se recarga solo ante cada cambio |
| `npm run build` | Compila para producción en `dist/` |
| `npm run watch` | Compila en modo desarrollo y recompila ante cada cambio |

## Conexión con el backend

La URL de la API **no está escrita en el código**: sale de los archivos de
ambiente, en `src/environments/`.

- `environment.ts`: el que usa `npm start`. Apunta a `http://localhost:3000/api`,
  que es donde escucha el backend por defecto.
- `environment.production.ts`: el que usa `npm run build`. Apunta a `/api`,
  asumiendo que el frontend se sirve detrás del mismo dominio que la API.

Si el backend corre en otro puerto o en otra máquina, cambiá `apiUrl` en
`src/environments/environment.ts` y volvé a correr `npm start`.

## Estructura del proyecto

```
src/
  environments/            configuración por ambiente (URL de la API)
  material-theme.scss      tema de Angular Material (colores, tipografía)
  styles.css               estilos globales y breakpoints de la app
  app/
    core/                  piezas transversales
      breakpoints.ts         breakpoints SM / MD / LG
      fechas.ts              conversión de fechas y horas entre la API y los formularios
      guards/                quién puede entrar a cada ruta
      interceptors/          sesión y manejo de errores HTTP
      services/              sesión (AuthService) y notificaciones (snackbars)
    models/                interfaces del dominio (una por entidad)
    services/              acceso a la API (un servicio por recurso)
    components/
      layout/                barra superior y menú de navegación
      login/                 inicio de sesión (única pantalla fuera del layout)
      shared/                componentes reutilizables (diálogo de confirmación)
      tipo-cancha/           ABM de tipos de cancha
      tipo-evento/           ABM de tipos de evento
      equipamiento/          ABM del equipamiento que se alquila
      cancha/                ABM de canchas, con filtro por tipo
      horario/               turnos de cada cancha, de a uno o en lote
      usuario/               ABM de usuarios
      reserva/               reservar un turno (caso de uso central)
      gestion-reservas/      listado de reservas: filtrar, reprogramar y cancelar
      evento/                el evento de cada reserva
      pago/                  lo cobrado por cada reserva
      perfil/                la cuenta propia de quien está conectado
      no-encontrado/         pantalla 404
    app.routes.ts          rutas de la aplicación (con lazy loading)
    app.config.ts          providers de la aplicación
```

`components/tipo-cancha/` es la **implementación de referencia**: el resto de las
entidades del dominio se construyen replicando esa estructura (modelo, servicio,
listado con estados de carga, vacío y error, y diálogo con un formulario
reutilizable).

## Diseño responsive

El CSS se escribe **mobile-first**: el estilo base corresponde a pantalla chica y
las media queries solo agregan reglas hacia arriba. Los tres breakpoints son:

| Breakpoint | Ancho mínimo | Comportamiento |
|---|---|---|
| SM | 600 px | Listados en tarjetas, dos por fila |
| MD | 960 px | Menú lateral fijo, listados en tabla |
| LG | 1280 px | Mismo layout que MD, con más espaciado |
