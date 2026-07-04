import { Router } from "express";

import {
  addItem,
  deleteItem,
  editItem,
  getItemById,
  getItemsByCity,
} from "../controllers/item.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

import upload from "../middlewares/multer.middleware.js";

import { validateBody } from "../middlewares/validate.middleware.js";

import {
  addItemValidation,
  editItemValidation,
} from "../validators/item.validator.js";

const itemRouter = Router();

itemRouter.post(
  "/add",
  authenticate,
  upload.single("image"),
  validateBody(addItemValidation),
  addItem,
);

itemRouter.patch(
  "/edit/:itemId",
  authenticate,
  upload.single("image"),
  validateBody(editItemValidation),
  editItem,
);

itemRouter.get(
  "/:itemId",
   authenticate,
    getItemById
  );

itemRouter.delete(
  "/:itemId",
   authenticate,
    deleteItem
  );

itemRouter.get(
  "/get-by-city/:city", 
  authenticate,
   getItemsByCity
  );

export default itemRouter;
