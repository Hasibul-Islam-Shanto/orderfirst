declare global {
  namespace Express {
    interface Request {
      requestId?: string | undefined;
      user?: {
        id: string;
        role: string;
        name?: string | undefined;
        email?: string | undefined;
      } | undefined;
    }
  }
}

export {};
