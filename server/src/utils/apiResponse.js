/**
 * Consistent API Response Helper
 */
class ApiResponse {
  static success(res, data = {}, message = null, statusCode = 200) {
    const response = {
      success: true,
      data
    };
    if (message) {
      response.message = message;
    }
    return res.status(statusCode).json(response);
  }

  static paginated(res, data = [], meta = {}, message = null, statusCode = 200) {
    const { page, limit, total, telemetry, ...rest } = meta;
    const response = {
      success: true,
      data,
      pagination: { page, limit, total, ...rest },
    };
    if (telemetry) {
      response.telemetry = telemetry;
    }
    if (message) {
      response.message = message;
    }
    return res.status(statusCode).json(response);
  }

  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message
    };
    if (errors) {
      response.errors = errors;
    }
    return res.status(statusCode).json(response);
  }
}

module.exports = ApiResponse;
