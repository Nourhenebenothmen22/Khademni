import "./zod-openapi.js";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import * as validators from "../common/validators/index.js";

const registry = new OpenAPIRegistry();

// Register JWT Bearer Authentication Security Scheme
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "Provide your JWT access token (Bearer <token>) to authenticate requests.",
});

// Register all exported Zod schemas from common/validators
Object.entries(validators).forEach(([name, schema]) => {
  if (schema && typeof schema === "object" && schema instanceof z.ZodType) {
    registry.register(name, schema);
  }
});

const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "Intelligent Teacher Recruitment Platform API",
    version: "1.0.0",
    description:
      "Backend REST API for Intelligent Teacher Recruitment Platform featuring AI matching, application parsing, and role-based recruitment workflows.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Development Server",
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
});
