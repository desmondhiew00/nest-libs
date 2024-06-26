# nestlib-aws-s3

This package is for self use. Feel free to use it if you find it useful.\
This library is a wrapper around the `aws-sdk` to provide a simple interface for uploading and downloading files from S3.

## Installation

```bash
# required packages
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner

# install the package
npm install nestlibs-aws-s3
```

## Usage

Import the `AwsS3Module` in your root module and call the `forRoot` method with the configuration object.

```typescript
import { AwsS3Module } from 'nestlibs-aws-s3';

@Module({
  imports: [
    AwsS3Module.forRoot({
      prefix: 'test', // prefix on bucket (exp: dev, test, staging)
      region: 'us-west-2',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      bucketName: 's3-bucket-name',
    }),
  ],
})
export class AppModule {}
```

### Use the Service

```typescript
import { AwsS3Service } from 'nestlibs-aws-s3';
import { FileUpload, S3KeyBuilder } from 'graphql-upload-minimal';

@Injectable()
export class AppService {
  constructor(private readonly awsS3Service: AwsS3Service) {}

  async getPresignedUrl(key: string) {
    return this.s3.getSignedUrl(key, 'put', { acl: 'public-read' });
  }

  async uploadFile(file: Express.Multer.File) {
    // /users/1/profile/{uuid}.jpg
    const key = this.awsS3Service.generateUniqueKey(file.originalname, 'users', userId, 'documents');
    const { Location, Key } = await this.awsS3Service.uploadFile(file);
    return Key;
  }

  async uploadAvatarWithPresignedUrl(file: FileUpload, user: User) {
    const { filename } = await file;
    const fileKey = this.s3.fileKey("avatar.jpg", "filename").directory("users", `${user.id}`, "photos").toString();
    // fileKey: /users/{userId}/profile/avatar.jpg
    const preSignedUrl = this.s3.getSignedUrl(fileKey, 'put', {
      acl: 'public-read',
    });
    return preSignedUrl;
  }

  async uploadDocument(file: FileUpload, user: User) {
    const { filename } = await file;
    const fileKey = this.s3.fileKey(filename).directory("users", `${user.id}`, "documents").toString();
    // fileKey: /users/{userId}/documents/{uuid}.pdf
    const { Location, Key } = await this.s3.uploadGqlFile(file, fileKey);
    return Key;
  }
}
```

### Frontend Upload Using Presigned Url

```typescript
import React, { useState } from 'react';
import axios from 'axios';

const UploadFile = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const uploadWithPresignedUrl = async () => {
    const {
      data: { presignedUrl },
    } = await axios.get('/presigned-url/' + selectedFile.name);

    try {
      await axios.put(presignedUrl, selectedFile, {
        headers: { 'Content-Type': selectedFile.type },
        onUploadProgress: (progressEvent) => {
          setUploadProgress((prev) => ({
            ...prev,
            [index]: Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            ),
          }));
        },
      });
      console.log('Upload successful!');
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const uploadFile = async () => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      await axios.post('/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Upload successful!');
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default UploadFile;
```
