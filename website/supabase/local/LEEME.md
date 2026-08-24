# Una base local, para probar las migraciones antes de pegarlas en Supabase

Dos caminos. El primero no instala nada y es el que corre solo con `npm run probar`; el
segundo te deja una base de verdad, encendida, para hurgar con `psql`.

---

## Camino corto: sin instalar nada

```bash
npm run probar:migraciones
```

Aplica `andamio.sql` y **las quince migraciones reales del repo, en orden**, sobre PGlite
—PostgreSQL compilado a WebAssembly, corriendo dentro de Node— y después verifica lo que la
`0015` promete: que cada tienda vea sus click-outs y sólo los suyos, y que las columnas que no
son suyas den permiso denegado.

Sin servicio, sin Docker, sin contraseña. Es lo que corre en CI y en la revisión semanal.

---

## Camino largo: Postgres.app

Sirve para lo que el camino corto no da: una base encendida contra la que hacer consultas a
mano, probar una migración nueva antes de escribirla bien, o ver el esquema completo.

### 1. Instalarlo

Bajalo de **https://postgresapp.com** (la versión universal, que anda en Apple Silicon),
arrastrá `Postgres.app` a `Aplicaciones`, abrilo y apretá **Initialize**. Levanta en el puerto
`5432` y crea una base con tu nombre de usuario.

> Es una app firmada y notarizada; la primera vez macOS va a pedir confirmación para abrirla.

### 2. Dejar `psql` a mano

Postgres.app no toca el `PATH` solo. En zsh:

```bash
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
```

Abrí una terminal nueva y comprobá que quedó:

```bash
psql --version
```

Tiene que decir 15 o más. **Abajo de 15 no sirve para esto**: la `0015` usa
`security_invoker`, que no existe antes, y la migración va a fallar — que es el
comportamiento correcto, no un problema a esquivar.

### 3. Crear la base

```bash
createdb notebooks_local
```

### 4. Andamio primero, migraciones después

El orden importa: `andamio.sql` deja puestos los privilegios por defecto, y eso sólo alcanza a
las tablas que se creen **después**.

```bash
cd website && psql -d notebooks_local -v ON_ERROR_STOP=1 -f supabase/local/andamio.sql
```

```bash
cd website && for f in supabase/migrations/0*.sql; do psql -d notebooks_local -v ON_ERROR_STOP=1 -f "$f" || break; done
```

`ON_ERROR_STOP=1` es lo que hace que se frene en la primera que falle en vez de seguir de
largo dejando la base a medio migrar.

### 5. Mirar como si fueras una tienda

Las policies preguntan por `auth.uid()`, que acá sale del ajuste `local.uid`. Para ponerte en
los zapatos de un miembro de tienda:

```bash
psql -d notebooks_local
```

```sql
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into store_members (user_id, store_id) values ('11111111-1111-1111-1111-111111111111', 'tienda-a');

set role authenticated;
set local.uid = '11111111-1111-1111-1111-111111111111';

select count(*) from store_click_outs;      -- sólo los de tienda-a
select visitor_id from click_outs limit 1;  -- debe fallar: permission denied
select * from click_outs limit 1;           -- debe fallar por lo mismo

reset role;
```

### 6. Empezar de cero

```bash
dropdb notebooks_local && createdb notebooks_local
```

---

## Lo que ninguno de los dos es

**No es Supabase.** No hay PostgREST, no hay Supabase Auth, no hay Storage. O sea que el sitio
no se puede correr contra esto: `NEXT_PUBLIC_SUPABASE_URL` espera una API, no un Postgres.

Sirve para lo que las migraciones son —SQL, permisos y policies— y para nada más. Y `auth.uid()`
acá es un ajuste de sesión, no un JWT verificado: verifica **la lógica** de una policy, no que
en Supabase esté bien configurada la instancia.
