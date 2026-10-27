# IG · Quién no me sigue

[Español](README.md) · [English](README.en.md)

Extensión para Edge y Chrome que ayuda a analizar las conexiones de una cuenta de Instagram y comparar exportaciones locales. Es un proyecto independiente, sin afiliación con Instagram o Meta.

![Pantalla principal sin sesión](docs/popup.png)

> **Estado:** el análisis en vivo usa interfaces internas de Instagram y puede ser limitado o cambiar sin aviso. No se ha completado una verificación integral con una cuenta real en esta versión. Consulta el [caso real observado](docs/caso-real.es.md).

## Funciones

- **En vivo:** detecta la sesión activa, consulta relaciones y conserva el progreso disponible. Los resultados dependen de lo que Instagram devuelva.
- **Exportación oficial:** compara archivos JSON de seguidores y seguidos en el navegador y genera un informe HTML.
- **Revisión:** muestra perfiles y enlaces; permite exportar resultados. La disponibilidad de fotos depende de los datos obtenidos.
- **Control:** detiene el proceso ante señales de límite o verificación. Las pausas no garantizan evitar restricciones.

![Análisis local sin datos personales](docs/analisis-local.png)

## Guías

- [Instalación paso a paso en español](docs/instalacion.es.md)
- [Installation guide in English](docs/install.en.md)
- [Funcionamiento, permisos y resolución de problemas](docs/funcionamiento.es.md)
- [Architecture, permissions and troubleshooting](docs/how-it-works.en.md)
- [Caso real observado](docs/caso-real.es.md) · [Observed real-world case](docs/real-case.en.md)

## Desarrollo

El repositorio contiene una extensión Manifest V3 sin proceso de compilación. Comprueba la sintaxis con `node --check background.js`, `node --check popup.js`, `node --check local-core.js` y `node --check local.js`. Estas comprobaciones no validan la API interna de Instagram.

No subas exportaciones, cookies, tokens, contraseñas, resultados personales ni capturas con datos de cuentas. `soporte@example.invalid` es un marcador de posición; configúralo antes de distribuir el proyecto.
