// apps/backend/src/types.ts
export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type Memory = {
  id: string;
  userId: string;
  title: string;
  fullText: string;
  type?: string;
  createdAt: string;
  updatedAt?: string;
};

export type Chunk = {
  id: string;
  memoryId: string;
  userId: string;
  text: string;
  embedding: number[]; // mock embedding
  createdAt: string;
};
