const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Cloudinary 
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_KEY,
    api_secret: process.env.CLOUD_SECRET,
});
// End Cloudinary 

module.exports.upload = (req, res, next) => {
    if (req.file) {
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream(
                (error, result) => {
                    if (result) {
                    resolve(result);
                    } else {
                    reject(error);
                    }
                });

                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        async function upload(req) {
            let result = await streamUpload(req);
            // console.log(result.secure_url);
            req.body[req.file.fieldname] = result.secure_url;
            next();
        }

        upload(req);
    } else {
        next();
    }
}

module.exports.uploadMultiple = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) return next();

        const uploadBuffer = (file) => new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream((error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            });
            streamifier.createReadStream(file.buffer).pipe(stream);
        });

        req.body.images = await Promise.all(req.files.map(uploadBuffer));
        req.body.thumbnail = req.body.images[0];
        next();
    } catch (error) {
        next(error);
    }
};
