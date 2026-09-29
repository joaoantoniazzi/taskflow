export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };

      teamRole?:
        | "OWNER"
        | "ADMIN"
        | "MEMBER";

      projectRole?:
        | "OWNER"
        | "ADMIN"
        | "MEMBER";
    }
  }
}