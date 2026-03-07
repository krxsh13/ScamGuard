import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt
 * @param password - The plaintext password to hash
 * @returns The bcrypt hash
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password with a bcrypt hash
 * @param password - The plaintext password
 * @param hash - The bcrypt hash to compare against
 * @returns True if the password matches the hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
