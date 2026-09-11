// Cloudflare Pages Function: /api/horario
//
// Guarda y sirve UNA única copia compartida del horario en Cloudflare KV, para que
// director, secretaría y jefatura de estudios vean siempre los mismos datos, en vez
// de cada uno su propia copia en el localStorage de su navegador.
//
// Requiere un binding de KV llamado HORARIO_KV en el proyecto de Cloudflare Pages
// (Settings → Functions → KV namespace bindings). Sin ese binding, esta función
// responde con un error controlado y la web sigue funcionando solo con la copia
// local de cada navegador (como hasta ahora), sin romperse.

const AUTH_HASH = '569d5dd567625677de70d2209ae6566c0a665b209e59554b9b07ff76eb59d4f6'; // mismo hash que la contraseña de acceso a la web
const KV_KEY = 'estado_horario_v1';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequestGet({ env }) {
  if (!env.HORARIO_KV) return json({ error: 'KV no configurado' }, 500);
  try {
    const raw = await env.HORARIO_KV.get(KV_KEY);
    if (!raw) return json(null);
    return new Response(raw, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  } catch (e) {
    return json({ error: 'Error leyendo KV' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.HORARIO_KV) return json({ error: 'KV no configurado' }, 500);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON inválido' }, 400); }

  if (body.auth !== AUTH_HASH) return json({ error: 'No autorizado' }, 401);
  if (!Array.isArray(body.profesores)) return json({ error: 'Falta "profesores"' }, 400);

  const payload = JSON.stringify({
    profesores: body.profesores,
    cargasRef: body.cargasRef || {},
    updatedAt: new Date().toISOString(),
    updatedBy: typeof body.updatedBy === 'string' ? body.updatedBy.slice(0, 60) : '',
  });

  try {
    await env.HORARIO_KV.put(KV_KEY, payload);
    return new Response(payload, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  } catch (e) {
    return json({ error: 'Error guardando en KV' }, 500);
  }
}
