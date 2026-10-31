# Códigos QR para la barbería

## Generar

```bash
npm run qr -- https://tu-app.vercel.app             # un código general
npm run qr -- https://tu-app.vercel.app --barbers   # y uno por barbero
```

Los archivos salen en `qr/` (carpeta ignorada por git):

| Archivo | Para qué |
|---|---|
| `reservar.svg` | El código solo, vectorial. **Este es el que se manda a imprimir** |
| `reservar.png` | El mismo código en mapa de bits, 1200px, para webs o redes |
| `reservar-cartel.svg` | Cartel A5 listo para imprimir, con el código y las instrucciones |
| `reservar-<barbero>.*` | Lo mismo, pero preseleccionando barbero (`?barber=Carlos`) |

## La URL tiene que ser la de producción

Un QR impreso que apunte a `localhost` no funciona en el móvil de un cliente. El script
avisa si detecta una URL local, pero genera igualmente por si lo quieres para probar.

**El QR impreso es un cliente más de la API**: una vez pegado en la pared no se puede
cambiar. La ruta `/book` no debe renombrarse nunca sin dejar una redirección.

## Imprimir

- Usa siempre los `.svg`: son vectoriales y se mantienen nítidos a cualquier tamaño.
  El PNG solo para pantallas.
- Tamaño mínimo recomendado del código: **3 cm de lado** para escanear de cerca, **8 cm
  o más** si está en un escaparate o a distancia.
- Respeta el margen blanco alrededor: sin él muchos lectores fallan.
- No lo imprimas sobre fondo oscuro ni con poco contraste.

Los códigos se generan con corrección de errores alta, que tolera hasta un 30% de la
superficie dañada. Un código pegado en una barbería acaba con roces y manchas, y así
sigue funcionando.

## Comprobar antes de imprimir

Escanéalo con la cámara del móvil desde el archivo en pantalla y verifica que abre la
página real. Es un minuto que evita reimprimir carteles.
