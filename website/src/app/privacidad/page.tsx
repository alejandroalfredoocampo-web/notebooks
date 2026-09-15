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
      <p className="mt-2 text-sm text-slate-500">Última actualización: 15 de septiembre de 2026</p>

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
            Si dejás tu email para una alerta de precio o para que te avisemos cuando un modelo esté
            disponible, lo guardamos únicamente para eso. Cada mail de alerta trae un link para darte
            de baja con un clic, sin tener que ingresar ni escribirnos.
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
            empresas. Cada tienda ve únicamente los clicks que le mandamos a ella, y ninguno de los
            de las demás.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Cuenta y recomendaciones</h2>
          <p className="mt-2">
            Si creás una cuenta (con email y contraseña o con Google), guardamos tu email, tus
            favoritos y tus preferencias (usos, marcas y presupuesto). Los favoritos se guardan en
            nuestra base, asociados a tu cuenta, para que los veas desde cualquier dispositivo. Las
            preferencias incluyen si querés recibir recomendaciones por mail; <b>hoy todavía no
            enviamos esos mails</b>, y cuando empecemos lo vamos a decir acá. La autenticación la
            maneja Supabase; si entrás con Google, solo recibimos tu email (no tu contraseña).
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
            Aparte de las cookies, tu navegador guarda en su propia memoria (<i>localStorage</i>) dos
            cosas: los modelos que viste hace poco, que no salen nunca de tu dispositivo, y —si
            ingresaste a tu cuenta— la sesión, que es lo que te mantiene conectado. A diferencia de
            las cookies de arriba, la sesión sí la puede leer el código de la página. Las dos se borran
            cerrando la sesión o limpiando los datos del sitio.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Pedidos corporativos</h2>
          <p className="mt-2">
            Si pedís un presupuesto por volumen, tu pedido —con la empresa, el CUIT si lo cargaste y tus
            datos de contacto— lo pueden ver <b>todas las tiendas vinculadas al comparador</b> mientras
            esté abierto, para que te puedan cotizar. Es el servicio que pedís, pero conviene que lo
            sepas antes de mandarlo: no elegís a qué tienda le llega.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Protección contra abuso</h2>
          <p className="mt-2">
            Para que nadie use los formularios para mandar miles de altas, contamos cuántos envíos llegan
            desde cada dirección IP en una ventana de tiempo. Ese contador guarda la IP y se borra solo
            cuando vence la ventana, a más tardar al día siguiente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Quiénes procesan los datos</h2>
          <p className="mt-2">
            No le vendemos ni le cedemos datos a nadie. Para funcionar usamos estos proveedores, que los
            procesan por cuenta nuestra:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <b>Supabase</b> — la base de datos y el ingreso a las cuentas.
            </li>
            <li>
              <b>Vercel</b> — donde corre el sitio. Como cualquier servidor, registra las visitas
              (dirección IP, página pedida, navegador) en sus logs.
            </li>
            <li>
              <b>Resend</b> — el envío de los mails de alertas: recibe tu dirección y el contenido del
              aviso.
            </li>
            <li>
              <b>GitHub</b> — donde corren los procesos automáticos que actualizan precios y mandan las
              alertas.
            </li>
          </ul>
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
