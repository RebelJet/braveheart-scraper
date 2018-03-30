module.exports = function Leg(segments, layovers) {
  if (segments.length !== layovers.length+1) throw new Error('layovers and segments are a mismatch')
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length-1];
  const carriers = Array.from(new Set(segments.map(s => s.carrier)));
  const flightNumbers = Array.from(new Set(segments.map(s => s.flightNumber)));
  const duration = segments.reduce((duration, segment, i) => {
    const layoverMinutes = layovers[i] ? layovers[i].durationMinutes : 0;
    return duration + segment.durationMinutes + layoverMinutes
  }, 0);

  return {
    carriers: carriers,
    depAirportCode: firstSegment.depAirportCode,
    depDate: firstSegment.depDate,
    depTime: firstSegment.depTime,
    arrAirportCode: lastSegment.arrAirportCode,
    arrDate: lastSegment.arrDate,
    arrTime: lastSegment.arrTime,
    flightNumbers: flightNumbers,
    numStops: segments.length - 1,
    duration: duration,
    segments: segments,
    layovers: layovers,
  }
}
