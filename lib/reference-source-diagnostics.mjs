const referenceTables = new Set(['job_profiles', 'job_onet_mapping', 'onet_occupations', 'job_skill_requirements', 'skills', 'onet_essential_skills', 'onet_software_skills']);
const knownCodes = new Set(['42501', '42P01', '42703', '57014', 'PGRST200', 'PGRST202', 'PGRST204', 'PGRST205', 'PGRST301', 'PGRST302', 'PGRST303']);

// Server diagnostics only. Never emit error messages, details, URLs, credentials,
// filters or row content. Unknown provider codes are also withheld.
export function referenceReadDiagnostic({ table, error, status, signal }) {
  const code = knownCodes.has(error?.code) ? error.code : null;
  const httpStatus = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
  const message = typeof error?.message === 'string' ? error.message : '';
  const details = typeof error?.details === 'string' ? error.details : '';
  let category = 'unexpected_error';
  if (httpStatus === 401 || httpStatus === 403 || ['42501', 'PGRST301', 'PGRST302', 'PGRST303'].includes(code) || /permission denied|access denied|unauthorized|forbidden|request (?:blocked|disallowed)/i.test(message)) category = 'access_denied';
  else if (signal?.reason?.name === 'TimeoutError' || error?.name === 'TimeoutError' || [408, 504].includes(httpStatus) || /timed?\s*out|timeout/i.test(message)) category = 'timeout';
  else if (signal?.aborted || error?.name === 'AbortError' || code === '57014') category = 'cancelled';
  else if (['42P01', '42703', 'PGRST200', 'PGRST202', 'PGRST204', 'PGRST205'].includes(code)) category = 'schema_mismatch';
  else if (/fetch failed|network|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|TLS|certificate/i.test(`${message} ${details}`)) category = 'connection_failure';
  else if (httpStatus !== null) category = 'upstream_error';
  return { operation: 'reference_select', source: referenceTables.has(table) ? table : 'reference_client', category, httpStatus, code };
}
