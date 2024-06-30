const mongoose=require('mongoose');
const bcrypt=require('bcrypt');

const userSchema= new mongoose.Schema({
    username:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type:String,
        required: true
    },
    userDigitalProfilePhoto:{
        type:String,
        default: ''
    }
})

userSchema.pre('save',async function (next){
    if(this.isModified('password')){
        this.password=await bcrypt.hash(this.password,10);
    }
    next();
})

userSchema.virtual('avatar').get(function(){
    return `https://ui-avatars.com/api/?name=${this.username[0]}&background=random`;
})

const User=mongoose.model('User',userSchema);

module.exports=User;