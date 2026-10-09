import { S3Client } from 'bun';

export interface ImageRepository {
  fileExist: (objectKey: string) => Promise<boolean>;
  write: (objectKey: string, data: Response) => Promise<number>;
}

interface ImageRepositoryConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  apiEndpoint: string;
}

function createImageRepository(config: ImageRepositoryConfig): ImageRepository {
  const client = new S3Client({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    bucket: config.bucket,
    endpoint: config.apiEndpoint
  });

  function fileExist(objectKey: string): Promise<boolean> {
    const file = client.file(objectKey);

    return file.exists();
  }

  async function write(objectKey: string, data: Response): Promise<number> {
    const file = client.file(objectKey);
    return file.write(data);
  }

  return {
    fileExist,
    write
  };
}

export default createImageRepository;
