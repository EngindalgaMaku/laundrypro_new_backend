// Type definitions for node-forge
declare module "node-forge" {
  namespace forge {
    namespace util {
      function encode64(data: string): string;
      function decode64(data: string): string;
    }

    namespace asn1 {
      function fromDer(der: string): any;
    }

    namespace pkcs12 {
      function pkcs12FromAsn1(asn1: any, password: string): any;
    }

    namespace pki {
      const oids: {
        pkcs8ShroudedKeyBag: string;
        certBag: string;
      };

      function certificateToPem(cert: any): string;
    }

    namespace md {
      namespace sha256 {
        function create(): any;
      }
    }
  }

  export = forge;
}
