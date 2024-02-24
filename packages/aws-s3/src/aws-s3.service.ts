import {
  CompleteMultipartUploadCommandOutput,
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  ObjectCannedACL,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { FileUpload } from 'graphql-upload-minimal';
import * as mime from 'mime-types';
import 'multer';

export interface S3UploadConfig {
  prefix?: string; // Exp: dev, prod, etc
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
}

export interface SignOptions {
  expiresIn?: number;
  acl?: ObjectCannedACL;
  contentType?: string;
}

@Injectable()
export class AwsS3Service {
  public s3: S3Client;

  constructor(private config: S3UploadConfig) {
    this.s3 = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private addPrefix(key: string): string {
    return this.config.prefix ? `${this.config.prefix}/${key}` : key;
  }

  /**
   * @param key The key (file path) of the object
   * @param expiresIn The number of seconds until the presigned URL expires
   */
  async getSignedUrl(
    key: string,
    operation: 'get' | 'put' = 'get',
    options: SignOptions = {}
  ): Promise<string> {
    const Key = this.addPrefix(key);
    const expiresIn = options.expiresIn || 5 * 60; // 5 minutes

    let command: GetObjectCommand | PutObjectCommand;
    if (operation === 'put') {
      const ACL = options.acl || 'public-read';
      const ContentType = options.contentType || undefined;
      command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key,
        ACL,
        ContentType,
      });
    } else {
      command = new GetObjectCommand({ Bucket: this.config.bucketName, Key });
    }
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /**
   * @field Location: (string) The URL of the uploaded file (public-read ACL only)
   * @field Key: (string) The key (file path) of the uploaded file
   */
  async uploadFile(
    file: Express.Multer.File,
    key: string,
    acl: ObjectCannedACL = 'public-read'
  ): Promise<CompleteMultipartUploadCommandOutput> {
    const fileType = file.mimetype;
    const uploadParams = {
      Bucket: this.config.bucketName,
      Key: this.addPrefix(key),
      Body: file.buffer,
      ContentType: fileType,
      ACL: acl,
    };
    const parallelUploads3 = new Upload({
      client: this.s3,
      params: uploadParams,
    });
    return await parallelUploads3.done();
  }

  async uploadGqlFile(
    file: FileUpload,
    key: string,
    acl: ObjectCannedACL = 'public-read'
  ): Promise<CompleteMultipartUploadCommandOutput> {
    const { filename, mimetype, createReadStream } = await file;
    const contentType = mime.lookup(filename) || mimetype;
    const uploadParams: PutObjectCommandInput = {
      Bucket: this.config.bucketName,
      Key: this.addPrefix(key),
      Body: createReadStream(),
      ContentType: contentType,
      ACL: acl,
    };
    const parallelUploadS3 = new Upload({
      client: this.s3,
      params: uploadParams,
    });
    return await parallelUploadS3.done();
  }

  async removeFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });
    await this.s3.send(command);
  }

  async getFileInfo(key: string): Promise<HeadObjectCommandOutput> {
    const command = new HeadObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });
    return await this.s3.send(command);
  }

  async getFile(key: string): Promise<GetObjectCommandOutput> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });
    return await this.s3.send(command);
  }
}
