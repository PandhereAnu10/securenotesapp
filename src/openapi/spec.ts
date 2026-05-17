export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Vault Notes API",
    description:
      "Multi-user notes REST API with JWT authentication, sharing, pinning, and cryptographic audit ledger",
    version: "1.0.0",
  },
  servers: [{ url: "/", description: "Current host" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Note: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          content: { type: "string", description: "HTML content from rich text editor" },
          is_pinned: { type: "boolean" },
          is_owner: { type: "boolean" },
          is_shared: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      AuditLedgerEntry: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          note_id: { type: "string", format: "uuid" },
          title: { type: "string" },
          content: { type: "string" },
          actor_id: { type: "string", format: "uuid" },
          actor_email: { type: "string", format: "email" },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User created" },
          "400": { description: "Validation failed" },
          "409": { description: "Email already exists" },
        },
      },
    },
    "/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "JWT access token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { access_token: { type: "string" } },
                },
              },
            },
          },
          "401": { description: "Invalid email or password" },
        },
      },
    },
    "/notes": {
      get: {
        tags: ["Notes"],
        summary: "List notes owned by or shared with the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of notes",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Note" } },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Notes"],
        summary: "Create a new note",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Note created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Note" },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/notes/{id}": {
      get: {
        tags: ["Notes"],
        summary: "Get a note by ID (owner or collaborator)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Note details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Note" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Note not found" },
        },
      },
      put: {
        tags: ["Notes"],
        summary: "Update a note (owner only); creates audit ledger snapshot",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated note",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Note" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Note not found" },
        },
      },
      delete: {
        tags: ["Notes"],
        summary: "Delete a note (owner only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "204": { description: "No content" },
          "401": { description: "Unauthorized" },
          "404": { description: "Note not found" },
        },
      },
    },
    "/notes/{id}/share": {
      post: {
        tags: ["Notes"],
        summary: "Share a note with another user by email",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["share_with_email"],
                properties: { share_with_email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Shared successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "Note or user not found" },
          "409": { description: "Already shared" },
        },
      },
    },
    "/notes/{id}/pin": {
      patch: {
        tags: ["Notes"],
        summary: "Pin or unpin a note",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["pinned"],
                properties: { pinned: { type: "boolean" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Pin state updated" },
          "401": { description: "Unauthorized" },
          "404": { description: "Note not found" },
        },
      },
    },
    "/notes/{id}/audit-ledger": {
      get: {
        tags: ["Audit Ledger"],
        summary: "List immutable audit snapshots for a note",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Audit ledger entries",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/AuditLedgerEntry" },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Note not found" },
        },
      },
    },
    "/notes/{id}/restore": {
      post: {
        tags: ["Audit Ledger"],
        summary: "Restore note content from an audit ledger snapshot",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ledger_id"],
                properties: { ledger_id: { type: "string", format: "uuid" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Note restored" },
          "401": { description: "Unauthorized" },
          "404": { description: "Note or snapshot not found" },
        },
      },
    },
    "/about": {
      get: {
        tags: ["Meta"],
        summary: "About the API author and unique features",
        responses: { "200": { description: "About information" } },
      },
    },
    "/openapi.json": {
      get: {
        tags: ["Meta"],
        summary: "OpenAPI 3.0 specification",
        responses: { "200": { description: "OpenAPI JSON document" } },
      },
    },
  },
};
