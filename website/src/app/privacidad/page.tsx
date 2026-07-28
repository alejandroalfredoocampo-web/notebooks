import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos maneja Notebooks.com.ar: búsqueda por voz, alertas de precio, clicks a tiendas y cookies. Cómo los usamos y cómo darte de baja.",
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Política de privacidad</h1>
      <p className="mt-2 text-sm text-slate-500">Última actualización: julio 2026</p>

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
            Cuando hacés clic en “Ir a la tienda” registramos el evento de forma agregada (modelo,
            tienda, precio y momento) para medir el uso del sitio y sostener el servicio. No creamos un
            perfil tuyo con esto.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900">Cookies</h2>
          <p className="mt-2">
            El sitio público funciona sin registro y sin cookies de seguimiento. Solo usamos una cookie
            técnica para la sesión del panel de administración interno.
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
