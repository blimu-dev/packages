// Intermediate Representation types - language-agnostic representation of OpenAPI specs

export enum IRSchemaKind {
  Unknown = "unknown",
  String = "string",
  Number = "number",
  Integer = "integer",
  Boolean = "boolean",
  Null = "null",
  Array = "array",
  Object = "object",
  Enum = "enum",
  Ref = "ref",
  OneOf = "oneOf",
  AnyOf = "anyOf",
  AllOf = "allOf",
  Not = "not",
}

export interface IROperation {
  operationID: string;
  method: string;
  path: string;
  tag: string; // The primary tag used for service grouping (first allowed tag)
  originalTags: string[]; // All original tags from the OpenAPI operation
  summary: string;
  description: string;
  deprecated: boolean;
  pathParams: IRParam[];
  queryParams: IRParam[];
  requestBody: IRRequestBody | null;
  response: IRResponse;
}

export interface IRService {
  tag: string;
  operations: IROperation[];
}

export interface IR {
  services: IRService[];
  models: IRModel[];
  securitySchemes: IRSecurityScheme[];
  // ModelDefs holds a language-agnostic structured representation of components schemas
  modelDefs: IRModelDef[];
  // OpenAPI document used to generate this IR (optional, for saving spec to SDK package)
  openApiDocument?: any; // OpenAPIDocument type, but using any to avoid circular dependency
}

export interface IRParam {
  name: string;
  required: boolean;
  schema: IRSchema;
  // Description from the OpenAPI parameter
  description: string;
}

export interface IRRequestBody {
  contentType: string;
  typeTS: string;
  required: boolean;
  schema: IRSchema;
}

export interface IRResponse {
  typeTS: string;
  schema: IRSchema;
  // Description contains the response description chosen for this operation
  description: string;
  // Streaming support
  isStreaming: boolean;
  contentType: string;
  streamingFormat?: "sse" | "ndjson" | "chunked";
}

// IRModel represents a generated model (legacy, kept for compatibility)
export interface IRModel {
  name: string;
  decl: string;
}

// IRModelDef represents a named model (typically a component or a generated inline type)
// with a structured schema that is language-agnostic.
export interface IRModelDef {
  name: string;
  schema: IRSchema;
  annotations: IRAnnotations;
}

// IRAnnotations captures non-structural metadata that some generators may render.
export interface IRAnnotations {
  title?: string;
  description?: string;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  default?: any;
  examples?: any[];
}

// IRSchema models a JSON Schema (as used by OpenAPI 3.1) shape in a language-agnostic way
export interface IRSchema {
  kind: IRSchemaKind;
  nullable: boolean;
  format?: string;

  // Object
  properties?: IRField[];
  additionalProperties?: IRSchema; // typed maps; undefined when absent

  // Array
  items?: IRSchema;

  // Enum
  enumValues?: string[]; // stringified values for portability
  enumRaw?: any[]; // original values preserving type where possible
  enumBase?: IRSchemaKind; // underlying base kind: string, number, integer, boolean, unknown

  // Ref (component name or canonical name)
  ref?: string;

  // Compositions
  oneOf?: IRSchema[];
  anyOf?: IRSchema[];
  allOf?: IRSchema[];
  not?: IRSchema;

  // Polymorphism
  discriminator?: IRDiscriminator;
}

// IRField represents a field in an object schema
export interface IRField {
  name: string;
  type: IRSchema;
  required: boolean;
  // Pass-through annotations commonly used by generators
  annotations: IRAnnotations;
}

// IRDiscriminator represents polymorphism discriminator information
export interface IRDiscriminator {
  propertyName: string;
  mapping?: Record<string, string>;
}

// IRSecurityScheme captures a simplified view of OpenAPI security schemes
// sufficient for SDK generation.
export interface IRSecurityScheme {
  // Key is the name of the security scheme in components.securitySchemes
  key: string;
  // Type is one of: http, apiKey, oauth2, openIdConnect
  type: string;
  // Scheme is used when Type is http (e.g., "basic", "bearer")
  scheme?: string;
  // In is used when Type is apiKey (e.g., "header", "query", "cookie")
  in?: string;
  // Name is used when Type is apiKey; it is the header/query/cookie name
  name?: string;
  // BearerFormat may be provided for bearer tokens
  bearerFormat?: string;
}
