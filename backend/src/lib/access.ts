import { AuthUser } from "../types/domain";

export function canAccessOwner(user: AuthUser, ownerId: string | null | undefined): boolean {
  return user.role === "Admin" || ownerId === user.id;
}

export function canModifySensors(user: AuthUser): boolean {
  return user.role === "Admin" || user.role === "Engineer";
}

export function canModifyMasterData(user: AuthUser): boolean {
  return user.role === "Admin" || user.role === "Engineer";
}

export function ownerScope(user: AuthUser): { viewerUserId?: string; viewerRole: AuthUser["role"] } {
  return {
    viewerUserId: user.id,
    viewerRole: user.role
  };
}
