function summation (count) {
  if (count === 1) return 1
  return summation(count - 1) + count
}

module.exports = {
  summation,
}
