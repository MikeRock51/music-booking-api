import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler: ErrorRequestHandler = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // console.log(error.message);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: "error",
      message: error.message,
    });
    return;
  }

  res.status(500).json({
    status: "error",
    message: error.message || "Internal server error",
  });
  return;
};

const handleMultipartBoundryError = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.headers["content-type"] &&
    !req.headers["content-type"].includes("boundary")
  ) {
    const error = new AppError("No images uploaded", 400);
    next(error);
  }
};

export { errorHandler, AppError, handleMultipartBoundryError };
