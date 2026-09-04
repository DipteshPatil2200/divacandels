import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import multer from "multer";
import { MongoServerError } from "mongodb";

export class AppError extends Error {
  constructor(public status: number, message: string, public code = "REQUEST_ERROR") {
    super(message);
  }
}

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => void fn(req, res, next).catch(next);

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.header("x-request-id") ?? randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "Resource not found", "NOT_FOUND"));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "Each image must be 5 MB or smaller" : error.code === "LIMIT_FILE_COUNT" ? "Upload no more than 8 images at once" : "The image upload could not be processed";
    return res.status(422).json({ success: false, error: { code: error.code, message }, requestId: req.requestId });
  }
  if (error instanceof ZodError) {
    return res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Please check the submitted information", details: error.flatten() }, requestId: req.requestId });
  }
  if (error instanceof MongoServerError && error.code === 11000) {
    const target = Object.keys(error.keyPattern ?? {}).join(", ") || "unique value";
    return res.status(409).json({ success: false, error: { code: "DUPLICATE_VALUE", message: `A record with this ${target} already exists. Please use a unique value.` }, requestId: req.requestId });
  }
  if (error instanceof Error && /not found$/i.test(error.message)) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "The requested record no longer exists." }, requestId: req.requestId });
  }
  const appError = error instanceof AppError ? error : new AppError(500, "Something went wrong", "INTERNAL_ERROR");
  if (appError.status >= 500) console.error(`[${req.requestId}]`, error);
  return res.status(appError.status).json({ success: false, error: { code: appError.code, message: appError.message }, requestId: req.requestId });
}
