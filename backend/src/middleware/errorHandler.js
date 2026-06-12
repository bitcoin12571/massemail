export const errorHandler = (err, req, res, next) => {
  console.error(`[${req.requestId || 'no-request-id'}] Error:`, err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Each attachment must be 10 MB or smaller' });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({ error: 'A maximum of 5 attachments is allowed' });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error', details: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.status(err.status || 500).json({
    error: err.status && err.status < 500 ? err.message : 'Internal server error',
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
