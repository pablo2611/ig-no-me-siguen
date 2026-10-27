# Caso real: aviso de límite durante el análisis

[Inicio](../README.md) · [English](real-case.en.md)

## Contexto observado

El 27 de octubre de 2026, una persona abrió la versión **2.9.4** de la extensión en Edge y mostró una captura de la interfaz. El aviso visible decía que Instagram había pedido bajar la frecuencia y que la extensión se había pausado hasta el 29 de octubre. En esa captura no aparecía una lista de resultados.

## Resultado y alcance

- La interfaz mostró el mensaje de pausa y no presentó un análisis completado.
- El plazo de 48 horas corresponde a la lógica de la extensión; la captura no prueba la duración de una limitación impuesta por Instagram.
- La captura no permite identificar la solicitud concreta, confirmar el estado de la cuenta ni determinar si el aviso fue una detección correcta o un falso positivo.
- No se publican nombres de usuario, listas, cookies, capturas de la cuenta ni datos de autenticación.

Este caso documenta un **fallo o limitación observado**, no una demostración exitosa del análisis. Antes de afirmar que el modo en vivo funciona, se necesita una prueba completa con una cuenta autorizada, una comparación fiable y permiso para publicar evidencia anonimizada. La pantalla inicial y la de análisis local mostradas en el repositorio se capturaron en un perfil limpio; no muestran resultados reales.
