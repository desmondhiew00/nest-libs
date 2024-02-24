import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from "uuid";
import * as path from "path";

@Injectable()
export class S3KeyBuilder {
  private baseModule: string;
  private currentModule?: string;
  private components: string[] = [];

  constructor(baseModule: string) {
    this.baseModule = this.sanitize(baseModule);
  }

  /**
   * Remove slashes from the input string
   */
  private sanitize(input: string): string {
    return input.replace(/\//g, '');
  }

  module(moduleName: string): this {
    this.currentModule = this.sanitize(moduleName);
    return this;
  }

  /**
   * @param identifier Exp: User ID, Group ID, etc
   * @param filename Exp: image.jpg, video.mp4, etc
   * @param fixedName Exp: avatar, cover, etc
   * @returns  `{prefix}{base-module}{id}{module}{key}` | dev/users/1/profile/avatar.jpg
   */
  build(identifier: string | number | null, filename: string, fixedName?: string): string {
    identifier = identifier ? this.sanitize(identifier.toString()) : null;
    filename = this.sanitize(filename);
    fixedName = fixedName ? this.sanitize(fixedName) : undefined;

    this.components = [this.baseModule];

    if (identifier) {
      this.components.push(identifier);
    }

    if (this.currentModule) {
      this.components.push(this.currentModule);
      this.currentModule = undefined; // Reset the module for subsequent builds
    }

    const extension = path.extname(filename);
    if (fixedName) {
      this.components.push(`${fixedName.replace(".", "")}${extension}`);
    } else {
      const uniqueId = uuidv4();
      this.components.push(`${uniqueId}${extension}`);
    }

    return this.components.join('/');
  }
}
