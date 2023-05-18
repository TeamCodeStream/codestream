/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express'
import { getAllCatsController, getSpecificCatController } from '../controllers/cats'
import validator from '../validators/cats'

const router = Router()

router.get('/', getAllCatsController)
router.get('/:id', validator.validateId, getSpecificCatController)

export default router
