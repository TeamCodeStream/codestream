import { Request, Response, NextFunction } from 'express'

export function validateId (req: Request, res: Response, next: NextFunction): void {
  try {
    res.locals.id = parseInt(req.params.id, 10)
    next()
  } catch (err) {
    res.status(400).json({ error: { message: 'Invalid ID provided, must be an integer' } })
  }
}

export default {
  validateId
}
