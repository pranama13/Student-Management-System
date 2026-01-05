import File from '../models/File.js';
import { uploadToS3, deleteFromS3 } from '../utils/s3Upload.js';

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      // Try to upload to S3
      const fileUrl = await uploadToS3(req.file, 'student-files');

      // Save file metadata to database
      const fileDoc = await File.create({
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileUrl: fileUrl,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: req.user._id,
        category: req.body.category || 'other',
        description: req.body.description
      });

      res.status(201).json(fileDoc);
    } catch (uploadError) {
      // If S3 upload fails, fall back to local storage
      console.log('S3 upload failed, using local storage:', uploadError.message);
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      
      const fileDoc = await File.create({
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileUrl: fileUrl,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: req.user._id,
        category: req.body.category || 'other',
        description: req.body.description
      });

      res.status(201).json(fileDoc);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFiles = async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const query = {};

    // Filter by uploaded by user if not admin
    if (req.user.role !== 'admin') {
      query.uploadedBy = req.user._id;
    }

    if (category) {
      query.category = category;
    }

    const files = await File.find(query)
      .populate('uploadedBy', 'name email role')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await File.countDocuments(query);

    res.json({
      files,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && file.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    // Delete from S3 if URL contains s3.amazonaws.com
    if (file.fileUrl.includes('s3.amazonaws.com') || file.fileUrl.includes('.s3.')) {
      try {
        await deleteFromS3(file.fileUrl);
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
      }
    }

    await File.findByIdAndDelete(req.params.id);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
