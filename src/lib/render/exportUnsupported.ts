// The browser cannot encode a format this export needs; the UI shows it as a capability message.
// It lives apart from the export so the panel can recognise it without loading the encoder.
export class ExportUnsupportedError extends Error {}
