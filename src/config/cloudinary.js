require('dotenv').config();

const axios = require('axios');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const connectToCloudinary = async () => {
    try {
        await axios.get(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/ping`, {
            auth: {
                username: CLOUDINARY_API_KEY,
                password: CLOUDINARY_API_SECRET
            }
        }).then((response) => {
            console.log('Connection Successful to Cloudinary Server', response.data);
        })
        
    } catch (err) {
        console.log('Error Connecting to Cloudinary Server', err);
    }
}

module.exports = connectToCloudinary;