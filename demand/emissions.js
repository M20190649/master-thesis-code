const gas = 0.7232
const diesel = 0.2465
const alternative = 1 - gas - diesel
const fuelTypeDistribution = {
  gas,
  diesel,
  alternative,
}

const emissionClassDistributions = {
  gas: {
    PC_G_EU0: 0,
    PC_G_EU1: 0.0387, // Euro 0 + Euro 1
    PC_G_EU2: 0.0738,
    PC_G_EU3: 0.12,
    PC_G_EU4: 0.7675, // Euro 4 + Euro 5 + Euro 6
    PC_G_EU5: 0,
    PC_G_EU6: 0,
  },
  diesel: {
    PC_D_EU0: 0,
    PC_D_EU1: 0.005, // Euro 0 + Euro 1
    PC_D_EU2: 0.0159,
    PC_D_EU3: 0.1291,
    PC_D_EU4: 0.85, // Euro 4 + Euro 5 + Euro 6
    PC_D_EU5: 0,
    PC_D_EU6: 0,
  },
  alternative: {
    PC_Alternative: 1,
  },
}

// Distribution validation
const fuelTypeDistSum = Object.values(fuelTypeDistribution).reduce(
  (sum, p) => sum + p,
  0
)
if (fuelTypeDistSum !== 1) {
  throw new Error(`Fuel type distribution does not sum up to 1`)
}

for (const [ec, dist] of Object.entries(emissionClassDistributions)) {
  const sum = Object.values(dist).reduce((sum, p) => sum + p, 0)
  if (sum !== 1) {
    throw new Error(`${ec} distribution does not sum up to 1`)
  }
}

function getValueFromDistribution(distribution) {
  // See here why this works for
  // https://www.youtube.com/watch?v=MGTQWV1VfWk

  let rand = Math.random()
  for (const [value, p] of Object.entries(distribution)) {
    if (rand < p) {
      return value
    }
    rand -= p
  }
}

exports.getAllEmissionClasses = () => {
  const emissionClasses = []
  Object.values(emissionClassDistributions).forEach(distribution => {
    emissionClasses.push(...Object.keys(distribution))
  })
  return emissionClasses
}

exports.getEmissionClass = () => {
  const fuelType = getValueFromDistribution(fuelTypeDistribution)
  const emissionClassDistribution = emissionClassDistributions[fuelType]
  const emissionClass = getValueFromDistribution(emissionClassDistribution)
  return emissionClass
}
