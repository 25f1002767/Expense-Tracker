function notFound(_request, response) {
  response.status(404).json({ message: "The requested endpoint was not found." });
}

function errorHandler(error, _request, response, _next) {
  if (error.name === "ValidationError") {
    const fields = Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key, value.message]));
    return response.status(400).json({ message: "Please check the submitted fields.", fields });
  }
  if (error.name === "CastError") {
    return response.status(400).json({ message: "The supplied identifier or value is invalid." });
  }
  if (error.code === 11000) {
    return response.status(409).json({ message: "A record with those details already exists." });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error("Request failed:", error.name || "Error");
  return response.status(status).json({ message: status >= 500 ? "An unexpected server error occurred." : error.message });
}

module.exports = { errorHandler, notFound };
