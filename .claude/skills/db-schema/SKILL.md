---
description: Muestra el esquema actual de la base de datos a partir de las migraciones
---
Lee todos los ficheros de `supabase/migrations/` en orden cronológico y presenta el esquema
vigente resultante: tablas con columnas (tipo, default, constraints), índices (marcando los
parciales y su condición), y estado de RLS. Añade una nota de capacidad: tamaño estimado por
fila de `appointments` y filas que caben en los 500 MB del free tier. No ejecutes nada contra
la base de datos remota.
