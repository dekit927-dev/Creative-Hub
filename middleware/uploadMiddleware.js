const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${randomName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    // Photos & Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    // Videos
    '.mp4', '.webm', '.mov', '.mkv', '.ogv', '.avi',
    // Audio
    '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac',
    // Documents
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.zip'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  const isImage = file.mimetype.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
  const isVideo = file.mimetype.startsWith('video/') || ['.mp4', '.webm', '.mov', '.mkv', '.ogv', '.avi'].includes(ext);
  const isAudio = file.mimetype.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext);
  const isDoc = file.mimetype.startsWith('application/') || file.mimetype.startsWith('text/') || ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.zip'].includes(ext);

  if (allowedExtensions.includes(ext) && (isImage || isVideo || isAudio || isDoc)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please upload a photo (JPG, PNG, GIF, WEBP), audio (MP3, WAV, OGG), document (PDF, DOC, DOCX, TXT), or video file.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max for video uploads
  fileFilter
});

module.exports = upload;
