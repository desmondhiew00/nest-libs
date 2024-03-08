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
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
  public s3Url: string;
  public prefix: string;

  constructor(private config: S3UploadConfig) {
    this.s3 = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.s3Url = `https://${config.bucketName}.s3.${config.region}.amazonaws.com`;
    this.prefix = this.config.prefix || '';

    if (this.prefix) {
      if (!this.prefix.startsWith('/')) {
        this.prefix = '/' + this.prefix;
      }

      if (!path.isAbsolute(this.prefix)) {
        throw new Error('The prefix must be an absolute path');
      }

      this.s3Url += this.prefix;
    }
  }

  private addPrefix(key: string): string {
    this.validateKey(key);
    return this.prefix ? this.prefix + key : key;
  }

  private validateKey(key: string) {
    if (!path.isAbsolute(key)) {
      throw new Error('The key must be an absolute path');
    }
  }

  /**
   * Get s3 file URL
   * @param key
   * @returns https://bucket-name.s3.region.amazonaws.com/prefix/key
   */
  getFileUrl(key?: string | null) {
    if (!key) return key;
    if (key.startsWith('/')) return this.s3Url + key;
    return this.s3Url + '/' + key;
  }

  /**
   * Generate s3 file key using uuidv4 and directory
   * @example: generateUniqueKey('my-image.jpg', 'users', '1', 'profile')
   * @returns /users/1/profile/<uuidv4>.jpg
   */
  generateUniqueKey(filename: string, ...dir: string[]) {
    let dirPath = path.join(...dir);
    if (!dirPath.startsWith('/')) dirPath = '/' + dirPath;
    const ext = path.extname(filename);
    const uniqueFilename = uuidv4() + ext;
    return path.join(dirPath, uniqueFilename);
  }

  /**
   * Generate s3 file key using actual filename and directory
   * @example generateFileKey('my-image.jpg', 'users', '1', 'profile')
   * @returns /users/1/profile/my-image.jpg
   */
  generateFileKey(filename: string, ...dir: string[]) {
    let dirPath = path.join(...dir);
    if (!dirPath.startsWith('/')) dirPath = '/' + dirPath;
    return path.join(dirPath, filename);
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

  /**
   * @param file import { FileUpload } from 'graphql-upload-minimal';
   * @param key /users/1/profile/avatar.jpg, /groups/1/cover/image.jpg, etc
   * @param acl public-read | private | public-read-write | authenticated-read | aws-exec-read | bucket-owner-read | bucket-owner-full-control
   */
  async uploadGqlFile(
    gqlFile: FileUpload,
    key: string,
    acl: ObjectCannedACL = 'public-read'
  ): Promise<CompleteMultipartUploadCommandOutput> {
    const { filename, mimetype, createReadStream } = await gqlFile;
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
