// Throw this anywhere to send a specific HTTP status and message to the client.
// Example: throw new ApiError(404, "User not found");
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
