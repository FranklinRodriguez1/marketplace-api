import type { Capacity, PlatformRole } from '@cerca/contract';
import type { UserRecord } from '../domain/user';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface CreateUserInput {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  capacities: Capacity[];
  platformRole: PlatformRole;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  addCapacity(id: string, capacity: Capacity): Promise<UserRecord>;
  setSuspended(id: string, suspendedAt: Date | null): Promise<UserRecord>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CreateRefreshTokenInput {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshTokenRepository {
  create(input: CreateRefreshTokenInput): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  markRotated(id: string, replacedById: string, at: Date): Promise<void>;
  revoke(id: string, at: Date): Promise<void>;
  /** Reuse detected → revoke the whole family (that is how token theft is contained). */
  revokeFamily(familyId: string, at: Date): Promise<void>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}
