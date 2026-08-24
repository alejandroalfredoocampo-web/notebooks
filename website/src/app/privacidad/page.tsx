import type { Metadata } from "next";
import { metaRuta } from "@/lib/seo";

export const metadata: Metadata = metaRuta("/privacidad", {
  title: "Política de privacidad",
  description:
    "Qué datos maneja Notebooks.com.ar: búsqueda por voz, alertas de precio, clicks a tiendas y cookies. Cómo los usamos y cómo darte de baja.",
});

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Política de privacidad</h1>
      <p className="mt-2 text-sm text-slate-500">Última actualización: agosto 2026</p>

      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-slate-700">
        <p>
          Notebooks.com.ar es un comparador de precios: indexamos publicaciones de tiendas de terceros
          y te llevamos a comprar directo en la tienda. No vendemos ni intermediamos pagos. Esta página
          explica, en lenguaje claro, qué datos tocamos y para qué.
        </p>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Búsqueda por voz</h2>
          <p className="mt-2">
            El buscador de la home tiene un botón de micrófono <b>opcional</b>. Solo se activa cuando lo
            tocás y el navegador te pide permiso para usar el micrófono; nunca lo activamos solos.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              La transcripción la hace tu navegador con la <b>Web Speech API</b>. En algunos navegadores
              (por ejemplo Chrome), el audio puede procesarse en servidores del proveedor del navegador
              (Google), fuera de nuestro control y sujeto a sus propias políticas.
            </li>
            <li>
              <b>Nosotros no almacenamos</b> el audio ni la transcripción. El texto reconocido solo se
              usa para completar tu búsqueda y luego se descarta.
            </li>
            <li>
              Si negás el permiso, el buscador sigue funcionando escribiendo. No volvemos a insistir con
              el pedido de micrófono.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Alertas de precio</h2>
          <p className="mt-2">
            Si dejás tu email para una alerta de precio, lo guardamos únicamente para avisarte cuando el
            modelo baje. Podés pedir la baja en cualquier momento escribiéndonos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Clicks a tiendas</h2>
          <p className="mt-2">
            Cuando hacés clic en “Ir a la tienda” registramos el evento: el modelo, la tienda, el
            precio y el momento, si el dispositivo es celular o computadora, y el identificador
            anónimo de visitante y la campaña por la que llegaste que se explican más abajo. Es lo
            que nos permite cobrarle a la tienda por el tráfico que le mandamos, que es cómo se
            sostiene el sitio, y saber qué campaña lo generó.
          </p>
          <p className="mt-2">
            No le pedimos tu nombre ni tu email para esto y no cruzamos ese registro con datos de otras
            empresas. A la tienda le informamos el volumen de clicks, nunca quién hizo cada uno.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Cuenta y recomendaciones</h2>
          <p className="mt-2">
            Si creás una cuenta (con email y contraseña o con Google), guardamos tu email y tus
            preferencias (usos, marcas y presupuesto) para guardar tus favoritos y, si lo activás,
            enviarte recomendaciones por mail. Podés desactivar las recomendaciones desde tus
            preferencias o darte de baja en cualquier momento. La autenticación la maneja Supabase; si
            entrás con Google, solo recibimos tu email (no tu contraseña).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Cookies</h2>
          <p className="mt-2">
            El sitio público funciona sin registro y no tiene cookies de terceros: no usamos Google
            Analytics, ni el pixel de Meta, ni ninguna otra herramienta que le mande tu navegación a
            otra empresa. Las que sí usamos son nuestras, no las puede leer ningún script de la
            página y son estas:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <b>
                <code>nb_vid</code>
              </b>{" "}
              — un número al azar, sin ningún dato tuyo adentro, para no contar diez veces a la misma
              persona. Dura 400 días.
            </li>
            <li>
              <b>
                <code>nb_origen_90d</code>
              </b>{" "}
              — de dónde venís: los parámetros de campaña del link (<code>utm_…</code>,{" "}
              <code>gclid</code>, <code>fbclid</code> y equivalentes) o el sitio que te trajo. Guarda el
              primer contacto y el último. Dura 90 días <b>desde el primero</b> y no se renueva sola:
              cumplidos los 90 días se borra aunque sigas visitando el sitio.
            </li>
            <li>
              <b>
                <code>admin_session</code>
              </b>{" "}
              — la sesión del panel de administración interno. Solo la reciben quienes trabajan acá.
            </li>
          </ul>
          <p className="mt-2">
            <b>Cómo apagarlas.</b> Las dos primeras no se escriben si tu navegador manda la cookie{" "}
            <code>nb_atribucion</code> con el valor <code>no</code> en este dominio. Borrar las cookies
            del sitio también las elimina; el comparador funciona igual, solo dejamos de saber qué
            campaña trajo la visita.
          </p>
          <p className="mt-2">
            Aparte de las cookies, tu navegador guarda en su propia memoria (<i>localStorage</i>) los
            modelos que viste hace poco y tus favoritos. Eso no sale nunca de tu dispositivo y se borra
            limpiando los datos del sitio.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Contacto</h2>
          <p className="mt-2">
            Ante cualquier consulta sobre tus datos, escribinos. Actualizaremos esta política si
            sumamos nuevas funcionalidades que cambien qué información manejamos.
          </p>
        </section>
      </div>
    </div>
  );
}
