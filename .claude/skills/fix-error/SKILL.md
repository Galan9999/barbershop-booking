---
description: Debugging sistemático de un error (pégalo como argumento o descríbelo)
argument-hint: [mensaje de error o síntoma]
---
Error o síntoma: $ARGUMENTS

Procede sistemáticamente: (1) reproduce o localiza la evidencia exacta (fichero:línea, log);
(2) formula la hipótesis de causa raíz y verifícala leyendo el código, no adivinando;
(3) corrige la causa, no el síntoma; (4) verifica con `npx tsc --noEmit` y, si aplica, un caso
de prueba; (5) explica en dos líneas por qué ocurría. Si tocas el flujo de reservas, pasa el
gate G2 de docs/HOOKS.md.
