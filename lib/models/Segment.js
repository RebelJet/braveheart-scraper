module.exports = function Segment(obj) {
  return {
    carrier: obj.carrier,
    flightNumber: parseInt(obj.flightNumber),
    depAirportCode: obj.depAirportCode,
    depDate: obj.depDate,
    depTime: obj.depTime,
    arrAirportCode: obj.arrAirportCode,
    arrDate: obj.arrDate,
    arrTime: obj.arrTime,
    durationMinutes: obj.durationMinutes,
  }
}
