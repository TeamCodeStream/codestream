
import { Request, Response, NextFunction } from 'express'
import { getAllCatsModel, getSpecificCatModel } from '../models/cats'

export async function getAllCatsController (req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const cats = await getAllCatsModel()
    res.status(200).json({ results: cats })
  } catch (err) {
    next(err)
  }
}

export async function getSpecificCatController (req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const cat = await getSpecificCatModel(res.locals.id)

    if (cat === null) {
      return res.status(404).json({ error: { message: `Unable to find Cat ID ${res.locals.id as number}` } })
    }

    res.status(200).json({ results: cat })
  } catch (err) {
    next(err)
  }
}
