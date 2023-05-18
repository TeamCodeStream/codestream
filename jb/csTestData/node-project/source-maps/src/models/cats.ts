import newrelic from 'newrelic'
import { sleep } from '../utils'

const catData = [
  {
    id: 1,
    name: 'Manny',
    age: 5,
    breed: 'American Longhair',
    colors: ['black', 'white']
  },
  {
    id: 2,
    name: 'Sunny',
    age: 3,
    breed: 'American Shorthair',
    colors: ['orange', 'white']
  }
]

export async function getAllCatsModel (): Promise<Array<{ id: number, name: string }>> {
  const randomNumber = Math.floor(Math.random() * 20)

  await sleep(1000)

  return newrelic.startSegment('getAllCatsModel', true, () => {
    if (randomNumber <= 5) {
      throw new Error('Failed to get all cats in model')
    } else {
      return catData.map(function mapCats (cat) {
        return ({ id: cat.id, name: cat.name })
      })
    }
  })
}

export async function getSpecificCatModel (id: number): Promise<{ id: number, name: string, age: number, breed: string, colors: string[] } | undefined> {
  const randomNumber = Math.floor(Math.random() * 20)

  await sleep(1000)

  return newrelic.startSegment('getSpecificCatModel', true, () => {
    if (randomNumber <= 5) {
      throw new Error(`Failed to get cat id ${id} in model`)
    } else {
      return catData.find(function findCat (cat) {
        return cat.id === id
      })
    }
  })
}
