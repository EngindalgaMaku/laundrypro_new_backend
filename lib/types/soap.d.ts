// Type definitions for node-soap
declare module "soap" {
  export interface ISecurity {
    addOptions(options: any): void;
  }

  export class BasicAuthSecurity implements ISecurity {
    constructor(username: string, password: string);
    addOptions(options: any): void;
  }

  export interface Client {
    setSecurity(security: ISecurity): void;
    [key: string]: any;
  }

  export function createClient(
    url: string,
    callback: (err: any, client: Client) => void
  ): void;
  export function createClient(
    url: string,
    options: any,
    callback: (err: any, client: Client) => void
  ): void;
  export function createClientAsync(
    url: string,
    options?: any
  ): Promise<Client>;
}
