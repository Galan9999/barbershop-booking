---
paths:
  - "lib/email/**"
---
# Email transaccional (S4, G5)

- Toda plantilla exporta versión HTML **y** texto plano, como funciones puras de sus datos, en `lib/email/templates/`.
- HTML compatible con clientes de correo: tablas, estilos inline, sin JS. Asunto < 60 caracteres.
- Enlaces siempre absolutos sobre `APP_URL` (dominio propio); nunca IPs ni acortadores. Escapar todo dato de usuario interpolado en HTML.
- El fallo del proveedor se captura y devuelve `{ sent: false }`: un email fallido nunca revierte una reserva.
- Límites free: Resend 100/día, 3.000/mes. Fallback previsto: Brevo (300/día) tras la misma interfaz de envío.
