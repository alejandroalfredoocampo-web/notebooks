/**
 * Campo trampa para bots.
 *
 * Un formulario público sin captcha necesita alguna señal, y la más barata es un campo que
 * una persona no ve y un bot que completa todo lo que encuentra sí llena. Del lado del
 * servidor, si viene con algo se contesta `ok` sin guardar nada — que el bot crea que
 * funcionó es parte del punto.
 *
 * ## Por qué no `className="hidden"`
 *
 * Así estaba en el formulario corporativo, y `display: none` es lo primero que un bot medio
 * decente chequea antes de completar. Sacarlo del viewport con posición absoluta deja el
 * campo "visible" para el DOM y fuera de la pantalla para la persona.
 *
 * `aria-hidden` + `tabIndex={-1}` es lo que evita el daño colateral: sin eso, un lector de
 * pantalla lo anuncia y el tabulador se detiene en un campo que nadie puede ver, que es una
 * trampa para la persona equivocada.
 */
export default function Honeypot({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
      <label htmlFor={`hp-${name}`}>No completes este campo</label>
      <input
        id={`hp-${name}`}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
