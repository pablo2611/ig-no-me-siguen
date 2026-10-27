# Instalación paso a paso

[Inicio](../README.md) · [English](install.en.md)

## 1. Descargar el proyecto

1. En la página del repositorio, pulsa **Code** y luego **Download ZIP**.
2. Descomprime el archivo en una carpeta que pienses conservar. Si la mueves o eliminas después de instalar, el navegador podría dejar de encontrar la extensión.
3. Abre la carpeta extraída y comprueba que dentro estén `manifest.json`, `background.js` y `popup.html`. Si hay una carpeta dentro de otra, usa la que contiene `manifest.json`.

## 2. Cargar en Microsoft Edge

1. Abre Edge y escribe `edge://extensions` en la barra de direcciones.
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida**.
4. Selecciona la carpeta que contiene `manifest.json`.
5. Comprueba que aparece **IG - Quién no me sigue**. Puedes fijarla desde el menú de extensiones para encontrarla fácilmente.

## 3. Cargar en Google Chrome

1. Abre Chrome y entra en `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y selecciona la carpeta que contiene `manifest.json`.
4. Busca la extensión en el menú de extensiones y fíjala si lo deseas.

## 4. Analizar la cuenta en vivo

1. Abre Instagram en el mismo perfil del navegador e inicia sesión normalmente.
2. Abre la extensión y pulsa **Analizar cuenta**.
3. Observa el estado y espera los resultados. Puedes detener el proceso con **Parar**; si hay progreso guardado, aparecerá la opción de continuar.
4. Usa **Exportar HTML** o **Exportar TXT** cuando haya resultados confirmados.

El análisis en vivo utiliza interfaces no oficiales, puede fallar o ser limitado y no se ha verificado de extremo a extremo en esta versión. Si aparece una verificación o límite, respétalo y revisa Instagram. No hay una frecuencia que garantice evitar restricciones.

## 5. Usar la exportación local

1. En Instagram abre **Centro de cuentas → Tu información y permisos → Exportar tu información**. Los nombres pueden variar.
2. Solicita **Seguidores y seguidos**, para todo el período, en formato **JSON**, y descarga el archivo cuando Instagram lo tenga listo.
3. Descomprime el ZIP. Localiza los archivos de seguidores y seguidos, normalmente dentro de `connections/followers_and_following/`.
4. Abre la extensión y pulsa **Analizar exportación local**.
5. Selecciona todos los archivos `followers_*.json` en Seguidores y `following.json` o todas sus partes en Seguidos, de la misma exportación.
6. Pulsa **Analizar archivos** y, si lo deseas, **Descargar informe HTML**.

La extensión no puede detectar con certeza partes faltantes ni un intervalo incompleto. El resultado representa la fecha de la exportación.

## 6. Actualizar

Actualiza los archivos de la misma carpeta y pulsa **Recargar** en la tarjeta de `edge://extensions` o `chrome://extensions`. Si descargas un ZIP nuevo, sustituye el contenido de la carpeta que cargaste; cargar otra carpeta puede crear una instalación distinta. No elimines el perfil ni la extensión si necesitas conservar sus datos locales.

Para problemas comunes consulta [Funcionamiento y resolución de problemas](funcionamiento.es.md).
