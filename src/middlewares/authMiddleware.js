require('dotenv').config();

const jwt=require('jsonwebtoken');

JWT_SECRET=process.env.JWT_SECRET;

const authMiddleware=(req,res,next)=>{
    const token=req.headers.authorization.split(' ')[1];
    // console.log("token",token);
    if(!token){
        return res.status(401).json({message: 'Please authenticate'});
    }

    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        // console.log("Decoded token:", decoded);
        req.user = { id: decoded.id, username:decoded.username }; // Assign the user id to req.user
        // console.log("req.user:", req.user); // Check if req.user is correctly set
        next();
    }catch(err){
        console.log('Error: ',err);
        res.status(401).json({message: 'Please authenticate'});
    }
}

module.exports=authMiddleware;