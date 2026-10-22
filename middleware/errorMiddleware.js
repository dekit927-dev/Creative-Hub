function errorHandler(err, req, res, next) {
  console.error('Server error:', err);

  if (err.message && (err.message.includes('Invalid image') || err.message.includes('Invalid file') || err.message.includes('Invalid file type'))) {
    return res.status(400).json({ detail: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ detail: 'File is too large. Maximum size for video is 100 MB, audio is 30 MB, and photo is 15 MB.' });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.detail || err.message || 'Something went wrong on the server. Please try again.';

  res.status(statusCode).json({ detail: message });
}

module.exports = { errorHandler };
