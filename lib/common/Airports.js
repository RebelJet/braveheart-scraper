const airportsGeoTZ = require('./airports.json')

const airportCodeToAirport = new Map()
for (const airport of airportsGeoTZ) {
  airportCodeToAirport[airport.iata_code] = airport
}

exports.tzname = function tzname(aptCode) {
  return getval(aptCode,'tzname')
}

exports.cityCode = function cityCode(aptCode) {
  return getval(aptCode,'city_code')
}

function getval(aptCode, key) {
  let val = null
  const airport = airportCodeToAirport[aptCode]
  if (airport) {
    val = airport[key].trim()
  }
  return val
}
