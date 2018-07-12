// http://data.fixer.io/api/latest?access_key=ab83b4a88554d8543390062e34f033f9

const rates = {
  EUR: {
    USD: 1.167818
  }
};

exports.convert = function convert(price, from, to) {
  return price * rates[from][to];
}
