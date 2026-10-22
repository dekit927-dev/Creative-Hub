function errorHandler(err, req, res, next) {
  console.error('Server error:', err);

  if (err.message && err.message.includes('Invalid image')) {
    return res.status(400).json({ detail: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ detail: 'The image is too large. Maximum size is 5 MB.' });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.detail || err.message || 'Something went wrong on the server. Please try again.';

  res.status(statusCode).json({ detail: message });
}

module.exports = { errorHandler };
