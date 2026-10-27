# Funcionamiento y resolución de problemas

[Inicio](../README.md) · [English](how-it-works.en.md)

## Arquitectura

`popup.html` y `popup.js` ofrecen la interfaz. `background.js` ejecuta el proceso en segundo plano, consulta Instagram en el modo en vivo, guarda el progreso disponible en almacenamiento de sesión y administra pausas y exportaciones. `local.html`, `local.js` y `local-core.js` comparan los JSON seleccionados en el navegador. El informe HTML puede contener nombres de usuario y enlaces: guárdalo como información privada.

En vivo, la extensión lee la lista de cuentas seguidas e intenta determinar la reciprocidad; solo muestra como confirmados los casos para los que recibió un dato interpretado como negativo. Una cuenta sin dato queda sin resolver. Si la respuesta cambia o los datos están incompletos, los resultados pueden no representar toda la cuenta.

## Permisos

| Permiso | Uso declarado en el código |
|---|---|
| `cookies` | Identificar la sesión activa y preparar solicitudes a Instagram. |
| `storage` | Guardar estado, progreso, ajustes y pausas en el navegador. |
| `downloads` | Guardar informes. |
| `notifications` | Avisar sobre el proceso. |
| `tabs` | Abrir perfiles y obtener el contexto de la pestaña. |
| `alarms` | Programar pasos de unfollow automático. |
| Instagram y dominios de imágenes | Consultar el servicio en vivo y cargar fotos cuando estén disponibles. |

## Problemas frecuentes

- **No hay sesión:** inicia sesión en Instagram en el mismo perfil de Edge o Chrome y vuelve a intentarlo.
- **Límite, verificación o bloqueo:** deja de reintentar, abre Instagram y sigue sus indicaciones. Las 48 horas mostradas son una pausa de la extensión, no necesariamente el plazo establecido por Instagram.
- **Lista incompleta o sin dato:** puede haber respuestas parciales o cambios en las interfaces. No interpretes los casos sin resolver como confirmados.
- **El navegador interrumpió el análisis:** abre el popup y usa Continuar si hay un punto guardado; de lo contrario, empieza de nuevo.
- **Falla el service worker:** recarga la extensión y revisa la sección de errores. Una comprobación de sintaxis no demuestra que una sesión real funcione.
- **Faltan fotos:** la exportación local puede no incluirlas; las URL de fotos en vivo también pueden caducar.
- **JSON inválido:** selecciona los archivos de seguidores y seguidos correctos y todas sus partes. No compartas el archivo para reportar el fallo.

El canal de soporte incluido es un marcador de posición. El modo en vivo y el unfollow automático pueden estar sujetos a las políticas de Instagram y no garantizan protección contra restricciones.
