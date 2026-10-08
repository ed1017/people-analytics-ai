/** Identity validation only; this illustration does not select a dataset. */
export function validDatasetToken(value:unknown):value is string {
 return typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,95}:[0-9]{1,12}$/.test(value);
}
