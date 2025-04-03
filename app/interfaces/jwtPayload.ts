import { ObjectId } from "mongoose";
import { UserRole } from "../models/User";

export interface jwtPayload {
  id: string;
  email: string;
  role: UserRole;
}
