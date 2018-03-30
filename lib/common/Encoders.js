
exports.encodeMsgToWorker = function encodeMsgToWorker(type, jobId, payload) {
  jobId = jobId.length ? jobId : '-'.repeat(36);
  payload = (typeof payload === 'object') ? JSON.stringify(payload) : payload.toString().replace(/\n/g, '');
  return `${type}:${jobId}:${payload}\n`
}

exports.decodeMsgFromWorker = function decodeMsgFromWorker(data) {
  return [
    parseInt(data.substring(0,3)), // statusCode: 3 digit int
    data.substring(4,40), // jobId: 36 character uuid
    data.substring(41) // payload: variable-length string
  ]
}

exports.encodeMsgToDispatcher = function encodeMsgToDispatcher(statusCode, jobId, payload) {
  jobId = jobId.length ? jobId : '-'.repeat(36);
  payload = (typeof payload === 'object') ? JSON.stringify(payload) : payload.toString().replace(/\n/g, '');
  return `${statusCode}:${jobId}:${payload}\n`
}

exports.decodeMsgFromDispatcher = function decodeMsgFromDispatcher(data) {
  return [
    data.substring(0,3), // three-char type
    data.substring(4,40), // jobId: 36 character uuid
    data.substring(41) // payload: variable-length string
  ]
}
