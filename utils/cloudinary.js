const cloudinary = require('cloudinary').v2;

// Configure Cloudinary - Ensures configuration happens once
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file to Cloudinary using buffer data from multer
 * @param {Object} file - Multer file object with buffer
 * @param {String} folder - Optional folder path in Cloudinary
 * @returns {Promise<String>} - The Cloudinary URL
 */
async function uploadToCloudinary(file, folder = 'tours') {
    try {
        if (!file || !file.buffer) {
            throw new Error('Invalid file object provided to upload function');
        }

        console.log('Uploading file to Cloudinary:', {
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype
        });
        
        // Convert buffer to base64
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        
        // Generate a unique filename
        const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '-')}`;
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64Image, {
            public_id: `${folder}/${fileName}`,
            folder: 'morocco-travel-experts',
            resource_type: 'image'
        });

        console.log('Cloudinary upload successful, URL:', result.secure_url);
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
    }
}

/**
 * Upload a file to Cloudinary using express-fileupload
 * @param {Object} file - Express-fileupload file object
 * @param {String} folder - Optional folder path in Cloudinary
 * @returns {Promise<String>} - The Cloudinary URL
 */
async function uploadToCloudinaryExpress(file, folder = 'tours') {
    try {
        if (!file || !file.data) {
            throw new Error('Invalid file object provided to upload function');
        }

        console.log('Uploading file to Cloudinary via express-fileupload:', {
            filename: file.name,
            size: file.size,
            mimetype: file.mimetype
        });
        
        // Convert buffer to base64
        const base64Image = `data:${file.mimetype};base64,${file.data.toString('base64')}`;
        
        // Generate a unique filename
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '-')}`;
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64Image, {
            public_id: `${folder}/${fileName}`,
            folder: 'morocco-travel-experts',
            resource_type: 'image'
        });

        console.log('Cloudinary upload successful, URL:', result.secure_url);
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
    }
}

/**
 * Delete an image from Cloudinary
 * @param {String} url - Cloudinary URL of the image to delete
 * @returns {Promise<Object>} - Result of the deletion
 */
async function deleteFromCloudinary(url) {
    try {
        // Extract the public_id from the URL
        // Cloudinary URLs are typically like: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
        const urlParts = url.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicIdParts = publicIdWithExtension.split('.');
        // Remove the extension
        publicIdParts.pop();
        const folder = urlParts[urlParts.length - 2];
        const publicId = `morocco-travel-experts/${folder}/${publicIdParts.join('.')}`;

        const result = await cloudinary.uploader.destroy(publicId);
        console.log('Cloudinary delete result:', result);
        return result;
    } catch (error) {
        console.error('Cloudinary Delete Error:', error);
        throw new Error(`Failed to delete image from Cloudinary: ${error.message}`);
    }
}

module.exports = {
    uploadToCloudinary,
    uploadToCloudinaryExpress,
    deleteFromCloudinary,
    cloudinary
}; 