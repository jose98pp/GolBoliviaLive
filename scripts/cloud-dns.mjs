import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';
import { isIP } from 'node:net';
import { syncBuiltinESMExports } from 'node:module';

const TRANSIENT_DNS_ERRORS = new Set(['EAI_AGAIN', 'ECONNREFUSED', 'ETIMEOUT', 'ETIMEDOUT', 'EAI_FAIL']);

function dnsError(code, message, cause) {
  return Object.assign(new Error(message, { cause }), { code });
}

/** Usa DNS por HTTPS solo si falla el DNS nativo y el host está habilitado explícitamente. */
export function createFallbackLookup({ nativeLookup, fetch: request, allowedHosts }) {
  const permitted = new Set(allowedHosts.map((host) => host.toLowerCase().replace(/\.$/, '')));
  const cache = new Map();
  const pending = new Map();
  async function resolvePublicName(host) {
    const cached = cache.get(host);
    if (cached && cached.expires > Date.now()) return cached.addresses;
    if (!pending.has(host)) {
      const job = (async () => {
        const responses = await Promise.all([1, 28].map(async (type) => {
          const url = new URL('https://dns.google/resolve');
          url.searchParams.set('name', host);
          url.searchParams.set('type', String(type));
          let response;
          try {
            response = await request(url, { signal: AbortSignal.timeout(5000), redirect: 'error' });
          } catch (cause) {
            throw dnsError('EDNSHTTPS', 'No se pudo consultar DNS por HTTPS a través del proxy', cause);
          }
          if (!response.ok) throw dnsError('EDNSHTTPS', `DNS por HTTPS no disponible (HTTP ${response.status})`);
          const result = await response.json();
          if (!result.Question?.some((question) => question.name?.toLowerCase().replace(/\.$/, '') === host && question.type === type)) {
            throw dnsError('EDNSHTTPS', 'El resolutor devolvió una pregunta DNS distinta');
          }
          if (result.Status === 3) return [];
          if (result.Status !== 0 || result.TC) throw dnsError('EDNSHTTPS', 'El resolutor no devolvió una respuesta DNS completa');
          return (result.Answer || []).filter((answer) => answer.type === type).map((answer) => {
            const family = type === 1 ? 4 : 6;
            if (isIP(answer.data) !== family) throw dnsError('EDNSHTTPS', 'El resolutor devolvió una dirección inválida');
            return { address: answer.data, family, ttl: Math.max(0, Math.min(Number(answer.TTL) || 0, 300)) };
          });
        }));
        const records = responses.flat();
        if (!records.length) throw dnsError('ENOTFOUND', `DNS sin direcciones para ${host}`);
        // No filtrar direcciones privadas aquí: el proxy debe recibir todas y rechazar el destino completo.
        const addresses = records.map(({ address, family }) => ({ address, family }));
        cache.set(host, { addresses, expires: Date.now() + Math.min(...records.map((record) => record.ttl)) * 1000 });
        return addresses;
      })().finally(() => pending.delete(host));
      pending.set(host, job);
    }
    return pending.get(host);
  }
  return async (hostname, options) => {
    try {
      return await nativeLookup(hostname, options);
    } catch (error) {
      const host = typeof hostname === 'string' ? hostname.toLowerCase().replace(/\.$/, '') : '';
      if (!permitted.has(host) || !TRANSIENT_DNS_ERRORS.has(error.code)) throw error;
      const settings = typeof options === 'number' ? { family: options } : (options || {});
      const family = settings.family === 'IPv4' ? 4 : settings.family === 'IPv6' ? 6 : settings.family;
      const addresses = (await resolvePublicName(host)).filter((address) => !family || address.family === family);
      if (!addresses.length) throw dnsError('ENOTFOUND', `DNS sin direcciones para la familia solicitada: ${host}`);
      if (settings.order === 'ipv6first') addresses.sort((a, b) => b.family - a.family);
      return settings.all ? addresses : addresses[0];
    }
  };
}

const hosts = (process.env.CLOUD_DNS_ALLOWED_HOSTS || '').split(',').map((host) => host.trim()).filter(Boolean);
if (hosts.length) {
  const lookup = createFallbackLookup({ nativeLookup: dnsPromises.lookup.bind(dnsPromises), fetch: globalThis.fetch, allowedHosts: hosts });
  dnsPromises.lookup = lookup;
  dns.lookup = (hostname, options, callback) => {
    if (typeof options === 'function') { callback = options; options = undefined; }
    lookup(hostname, options).then((result) => {
      if (options?.all) callback(null, result);
      else callback(null, result.address, result.family);
    }, (error) => callback(error));
  };
  syncBuiltinESMExports();
}
