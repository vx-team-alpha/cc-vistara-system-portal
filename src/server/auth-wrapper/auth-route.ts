import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { resolveAuthContext } from "./context";
import {
  AccountNotFoundError,
  AuthActionError,
  ForbiddenError,
  UnauthorizedError,
} from "./errors";
import type { AuthRouteHandler, AuthRouteOptions, RouteParams } from "./types";

type NextRouteContext = {
  params?: Promise<RouteParams>;
};

/**
 * Wraps a Route Handler with the same guarantees as `authAction`, plus HTTP
 * status-code mapping for thrown errors. Unlike a Server Action, a Route Handler
 * is a plain HTTP endpoint with none of Next's Server Function origin/CSRF
 * checks, so it must turn failures into a response itself rather than letting
 * them reject the request.
 */
export function authRoute<TSchema extends ZodType | undefined = undefined>(
  handler: AuthRouteHandler<TSchema>,
  options: AuthRouteOptions<TSchema> = {},
) {
  return async (request: NextRequest, context: NextRouteContext = {}): Promise<Response> => {
    try {
      const params = (await context.params) ?? {};

      const input = options.schema
        ? options.schema.parse(await parseRequestInput(request))
        : undefined;

      const ctx = await resolveAuthContext();

      return await handler(
        { ...ctx, request, params },
        input as Parameters<AuthRouteHandler<TSchema>>[1],
      );
    } catch (error) {
      return errorResponse(error);
    }
  };
}

async function parseRequestInput(request: NextRequest): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") {
    return Object.fromEntries(request.nextUrl.searchParams);
  }

  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, code: "VALIDATION_ERROR", message: "Invalid input", issues: error.issues },
      { status: 400 },
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { success: false, code: error.code, message: error.message },
      { status: 401 },
    );
  }

  // Nothing in the wrapper raises this any more — RLS handles authorization —
  // but a handler may still throw it deliberately to reject a request without
  // hand-rolling a response.
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { success: false, code: error.code, message: error.message },
      { status: 403 },
    );
  }

  // A broken invariant, not a client error: the signup trigger should have made
  // this row. 500 so it shows up in error tracking instead of being swallowed as
  // an expected 404.
  if (error instanceof AccountNotFoundError) {
    console.error("[authRoute] authenticated user has no account row", error);
    return NextResponse.json(
      { success: false, code: error.code, message: "Internal server error" },
      { status: 500 },
    );
  }

  if (error instanceof AuthActionError) {
    return NextResponse.json(
      { success: false, code: error.code, message: error.message },
      { status: 400 },
    );
  }

  console.error("[authRoute] unhandled error", error);
  return NextResponse.json(
    { success: false, code: "INTERNAL_ERROR", message: "Internal server error" },
    { status: 500 },
  );
}
