export class AuthActionError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "AuthActionError";
  }
}

export class UnauthorizedError extends AuthActionError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AuthActionError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

/**
 * The caller is authenticated but has no `accounts` row. This should be
 * impossible — the `on_auth_user_created` trigger creates one inside GoTrue's
 * signup transaction — so treat it as a broken invariant, not a normal state.
 */
export class AccountNotFoundError extends AuthActionError {
  constructor(message = "Account not found") {
    super(message, "ACCOUNT_NOT_FOUND");
    this.name = "AccountNotFoundError";
  }
}
