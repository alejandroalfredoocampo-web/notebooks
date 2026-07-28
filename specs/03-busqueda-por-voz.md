# 03 — Búsqueda por voz en la home

## Objetivo
Permitir dictar la búsqueda por necesidad en vez de escribirla: un botón de micrófono en el buscador
de la home transcribe con la Web Speech API (locale `es-AR`) y alimenta el buscador existente
(`parseQuery.ts`). Extiende la feature #3 ("para gaming hasta 3 millones", hablado). Ya está scopeado
en `BACKLOG.md`.

## Alcance
- **MVP**: botón de micrófono en el `<form>` de búsqueda de la home (`src/app/page.tsx`), transcripción
  en el navegador, permisos de micrófono con manejo del caso "denegado", y una página `/privacidad`
  como requisito previo. Fallback total: si el navegador no soporta la API, el botón no se muestra.
- **Fuera de MVP**: STT server-side, wake-word, dictado en el buscador del header en todas las páginas
  (se puede sumar luego reutilizando el componente).

## Sin cambios de datos
No toca Supabase. Es 100% front. No se almacena audio ni transcripción en el servidor.

## Componente `VoiceSearchButton` (client component)
- Envolver el input de búsqueda de la home en un client component (`HeroSearch`) que hoy es un
  `<form action="/notebooks">`. Mantener el submit GET a `/notebooks?q=` para no perder el fallback
  sin JS.
- Detección de soporte: `const SR = window.SpeechRecognition || window.webkitSpeechRecognition`. Si no
  existe → no renderizar el botón (Safari/Firefox tienen soporte parcial/nulo).
- Al hacer click:
  1. Instanciar `new SR()`, `lang = 'es-AR'`, `interimResults = true`, `continuous = false`.
  2. Estado visual: idle → escuchando (mic animado + "Te escucho…") → procesando.
  3. `onresult`: volcar el transcript (interino) al input en vivo; al `final`, setear el valor.
  4. `onend`: si hay texto, **enviar el form** (mismo submit que el botón →). El usuario cae en
     `/notebooks?q=...` y `parseQuery` interpreta igual que si hubiera escrito.
  5. `onerror`: manejar `not-allowed`/`service-not-allowed` (permiso denegado) y `no-speech`.

## Permisos de micrófono
- El prompt del navegador se dispara solo al arrancar `SR.start()`. Antes del primer uso, mostrar un
  micro-tooltip/hint aclarando que se va a pedir el micrófono y enlazando a `/privacidad`.
- Caso **denegado**: mostrar mensaje inline no intrusivo ("No pudimos acceder al micrófono. Podés
  escribir tu búsqueda o habilitar el permiso en el navegador.") y **no** re-pedir en loop (respetar
  el estado; si `not-allowed`, deshabilitar el botón esa sesión).
- Nunca pedir el micrófono en carga de página; siempre por gesto explícito del usuario.

## Página `/privacidad` (prerequisito)
- Ruta `src/app/privacidad/page.tsx` + link en `Footer.tsx`.
- Debe aclarar, en lenguaje claro: qué se captura (voz al usar el botón), que **el audio puede
  procesarse en servidores del proveedor del navegador** (p. ej. Google en Chrome) fuera de nuestro
  control, que **nosotros no almacenamos** el audio ni la transcripción, el uso del micrófono, y el
  resto de datos del sitio (cookies del admin, captura de email en alertas, click-outs). Es requisito
  **legal + de confianza** antes de pedir el micrófono.

## Accesibilidad / UX
- Botón con `aria-label="Buscar por voz"`, estado `aria-pressed` mientras escucha.
- Feedback visual claro de "escuchando" (no depender solo de color). Timeout de seguridad (~8 s) que
  corta `SR` si no hay resultado.
- En mobile, el mismo botón; el gesto de permiso es idéntico.

## Criterios de aceptación
- [ ] En Chrome desktop/Android, tocar el mic, decir "lenovo para gaming hasta dos millones" y que la
      búsqueda caiga en `/notebooks?q=...` con `parseQuery` mostrando "Entendí tu búsqueda".
- [ ] En un navegador sin soporte, el botón no aparece y el buscador funciona escribiendo.
- [ ] Denegar el permiso muestra el mensaje de fallback y no vuelve a spamear el prompt.
- [ ] `/privacidad` existe, está linkeada en el footer y describe el uso del micrófono.

## Notas
- La Web Speech API en Chrome envía audio a Google para transcribir: por eso la política de privacidad
  es bloqueante, no un "nice to have".
- Mantener el `<form>` con submit nativo asegura que la voz sea puramente aditiva.
