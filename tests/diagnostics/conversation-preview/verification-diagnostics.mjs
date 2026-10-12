/** Fixed allowlist only. Never serialize an exception, SDK response, URL or credential. */
const codes=new Set(['CONFIG','COMPILE','IMPORT','CONTEXT','CLIENT','READY','PRECHECK_OK','INSERT_BUILD','INSERT_WAIT','DISPATCH','INSERTED','DUPLICATE','TRANSPORT','ACCESS','CONSTRAINT','RESPONSE','VERIFY','VERIFIED']);
export function stage(report,code){if(codes.has(code))report?.(code);}
