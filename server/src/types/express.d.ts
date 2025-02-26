import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        username?: string;
      };
    }
  }
}

// Define a custom error handler type
export interface ErrorHandlerParams {
  err: any;
  req: Request;
  res: Response;
  next: NextFunction;
} 