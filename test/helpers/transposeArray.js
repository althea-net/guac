const tranposeArray = array => {
  return array[0].map((col, i) => {
    return array.map(row => row[i])
  })
}

module.exports = {
  tranposeArray
}

