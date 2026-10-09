import type { initDB } from '@db/db';

export interface ImageCacheRepository {
  has: (objectKey: string) => boolean;
  set: (objectKey: string) => void;
}

function createImageCacheRepository(db: ReturnType<typeof initDB>): ImageCacheRepository {
  const insertStmt = db.query<null, { key: string }>(`
  INSERT OR IGNORE INTO uploaded_images (key)
  VALUES ($key)
`);
  const hasKeyStmt = db.query<boolean, { key: string }>(
    'SELECT 1 FROM uploaded_images WHERE key = $key'
  );

  function has(objectKey: string): boolean {
    return hasKeyStmt.get({ key: objectKey }) || false;
  }

  function set(objectKey: string): void {
    insertStmt.run({
      key: objectKey
    });
  }

  return {
    has,
    set
  };
}

export default createImageCacheRepository;
