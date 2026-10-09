// Build-only SDK seam. The actual POST, dataset router, service and validators are bundled unchanged.
module.exports = class BuildOnlyOpenAI {
  constructor(options) {
    globalThis.__planB.checkClient(options);
    this.responses = {create:(payload, requestOptions) => globalThis.__planB.create(payload, requestOptions)};
  }
};
module.exports.loadSolutionProjectionInputs = async () => globalThis.__planB.forbiddenDatabase();
