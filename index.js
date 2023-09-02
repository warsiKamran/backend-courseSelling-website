const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.json());

//defining mongoose schemas
// In other words, each element in the "purchasedCourses" array will be an ObjectId that corresponds to a document in the "Course" collection. This establishes a relationship between the "User" and "Course" collections in MongoDB, typically for scenarios where users can purchase and access courses.
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    purchasedCourses: [{type: mongoose.Schema.Types.ObjectId, ref: 'Course'}]
});

const adminSchema = new mongoose.Schema({
    username: String,
    password: String 
});

const courseSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    imageLink: String,
    published: Boolean
});

//defining mongoose models
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Course = mongoose.model('Course', courseSchema);

//connect to mongodb
mongoose.connect('mongodb+srv://mohammadkamranwarsi2021:IrhosE1Je8pPpJFL@cluster0.4ijvnou.mongodb.net/courses',{useNewUrlParser: true, useUnifiedTopology: true});

//jwt function
//we are only verifying username because in the login we have already verified both username and password
const secretKey = "s3cr3tK3y";
const generateJwt = (user) =>{
    const payload = {username: user.username};
    return jwt.sign(payload, secretKey, {expiresIn:'1h'});
};

//jwt authentication
//we send the token like bearer jdfibbasdjnfiud which is stored in authHeader, therefore we have to split the token from it.
const authenticateJwt = (req,res,next) => {
    const authHeader = req.headers.authorization;
    if(authHeader){
        const token = authHeader.split(' ')[1];
        jwt.verify(token,secretKey,(err,user) => {
            if(err){
                return res.sendStatus(403);
            }
            req.user = user;   //extracting the username and storing it in req.user
            next();
        });
    } else{
        res.sendStatus(401);
    }
};

//ADMIN routes
//admin signup
app.post('/admin/signup', async(req,res) => {
    const {username, password} = req.body;
    const admin = await Admin.findOne({username});                    //waiting for finding the username
    if(admin){
        res.status(403).json({message: "admin already exists"});
    } else{
        const newAdmin = new Admin({username, password});
        await newAdmin.save();                                     //waiting for save operation
        const token = jwt.sign({username, role:'admin'}, secretKey, {expiresIn:'1h'});
        res.json({message:"sign in successfully", token});
    }
});

//admin login
app.post('/admin/login', async(req,res) => {
    const {username, password} = req.headers;
    const admin = await Admin.findOne({username, password});
    if(admin){
        const token = jwt.sign({username, role:'admin'}, secretKey, {expiresIn:'1h'});
        res.json({message:"logged in successfully", token});
    } else{
        res.status(403).json({message:"invalid credentials"}); 
    }
});

//creating courses
app.put('/admin/courses', authenticateJwt, async(req,res) => {
    const course = new Course(req.body);
    await course.save();
    res.json({message: "course created successfully", courseId: course.id});
});

//updating course
app.put('/admin/courses/:courseId', authenticateJwt, async(req,res) => {
    const course = await Course.findByIdAndUpdate(req.params.courseId, req.body, {new: true});    // 1st-> id , 2nd-> where to update
    if(course){
        res.json({message: "course updated successfully"});
    } else{
        res.status(404).json({message: "course not found"});
    }
});

//displaying all the courses
app.get('/admin/courses', authenticateJwt, async(req,res) => {
    const courses = await Course.find({});        // we want all the courses , therefore ({}) we can only send conditions also
    res.json({courses});
});



//USER routes
//user signup
app.post('/users/signup', async(req,res) => {
    const {username, password} = req.body;
    const user = await User.findOne({username});
    if(user){
        res.status(403).json({message:"user already exists"});
    } else{
        const newUser = new User({username, password});
        await newUser.save();
        const token = jwt.sign({username, role:'user'}, secretKey, {expiresIn: '1h'});
        res.json({message:"user created successfully", token}); 
    }
});

//user login
app.post('users/login', async(req,res) => {
    const {username, password} = req.header;
    const user = await User.findOne({username, password});
    if(user){
        const token = jwt.sign({username, role:'user'}, secretKey, {expiresIn: '1h'});
        res.json({message:"logged in successfully", token});
    } else{
        res.status(403).json({message:"invalid username or password"});
    }
});

//list all courses
app.get('/users/courses', authenticateJwt, async(req,res) => {
    const courses = await Course.find({published: true});
    res.json({courses});
});

//purchasing the course
app.post('/users/courses/:courseId', authenticateJwt, async(req,res) => {
    const course = await Course.findById(req.params.courseId);
    if(course){
        const user = await User.findOne({username: req.user.username});
        if(user){
            user.purchasedCourses.push(course);
            await user.save();
            res.json({message:"course purchased successfully"});
        } else{
            res.status(404).json({message:"user not found"});
        }
    } else{
        res.status(404).json({message:"course not found"})
    }
});

//view purchased courses
app.get('/users/purchasedCourses', authenticateJwt, async(req,res) => {
    const user = await User.findOne({username: req.user.username}).populate('purchasedCourses');
    if(user){
        res.json({purchasedCourses: user.purchasedCourses || []});
    } else{
        res.status(404).json({message:"user not found"});
    }
});

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
});