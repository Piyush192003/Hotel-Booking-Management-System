/**
 * Standard API success envelope:
 * { success: true, message, data, meta }
 */
export class ApiResponse {
  constructor(statusCode, data, message = 'Success', meta = undefined) {
    this.statusCode = statusCode;
    this.success = true;
    this.message = message;
    this.data = data;
    if (meta !== undefined) this.meta = meta;
  }

  static ok(data, message = 'Success', meta) {
    return new ApiResponse(200, data, message, meta);
  }

  static created(data, message = 'Created successfully', meta) {
    return new ApiResponse(201, data, message, meta);
  }

  static send(res, response) {
    return res.status(response.statusCode).json({
      success: response.success,
      message: response.message,
      ...(response.data !== undefined && { data: response.data }),
      ...(response.meta !== undefined && { meta: response.meta }),
    });
  }
}

export default ApiResponse;