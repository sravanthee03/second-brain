// apps/backend/src/data/userStore.ts
export interface User { id: string; email: string; passwordHash: string; createdAt: string; }
const users: User[] = [];
export function addUser(u: User) { users.push(u); }
export function findUserByEmail(email: string) { return users.find(x => x.email.toLowerCase() === String(email).toLowerCase()); }
export function getUserById(id: string) { return users.find(x => x.id === id); }
