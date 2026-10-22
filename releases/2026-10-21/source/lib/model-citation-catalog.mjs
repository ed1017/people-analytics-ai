/** Lossless model-only projection. Original evidence and citation validators stay authoritative. */
export function modelCitationCatalog(catalog) {
  const contexts = [], indexes = new Map();
  const entries = catalog.map(({scope, date, limitation, ...entry}) => {
    const context = {scope, date, limitation}, key = JSON.stringify(context);
    if (!indexes.has(key)) { indexes.set(key, contexts.length); contexts.push(context); }
    return {...entry, contextRef: indexes.get(key)};
  });
  return {
    entries, contexts,
    projection: 'Each entry keeps its exact citation ID and source location. contextRef indexes contexts for that entry\'s scope, date and limitation. No entries are sampled or omitted. Original evidence remains authoritative.',
  };
}
