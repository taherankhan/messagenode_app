const path = require('path');
const fs = require('fs');

const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Post = require("../models/post");

module.exports = {
    hello: () => {
        return "Hello world!";
    },
    createUser: async function ({ userInput }, req) {
        const { email, name, password } = userInput;
        console.log(email, name, password);

        const errors = [];
        if (!validator.isEmail(email)) {
            errors.push({ message: "E-Mail is invalid." });
        }
        if (
            validator.isEmpty(
                password
            ) /*|| !validator.isLength(password, { min: 5 })*/
        ) {
            errors.push({ message: "Password too short!" });
        }

        console.log(errors);
        if (errors.length > 0) {
            const error = new Error("Invalid input.");
            error.data = errors;
            error.code = 422;
            throw error;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error(`User with the provided email already exists.`);
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({
            email,
            name,
            password: hashedPassword,
        });

        const createdUser = await user.save();
        return {
            ...createdUser._doc,
            _id: createdUser._id.toString(),
        };
    },
    login: async function ({ email, password }) {
        const user = await User.findOne({ email });
        if (!user) {
            const error = new Error("User not found");
            error.code = 401;
            throw error;
        }

        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const error = new Error("Password is incorrect.");
            error.code = 401;
            throw error;
        }

        const token = jwt.sign(
            {
                email: user.email,
                userId: user._id.toString(),
            },
            "somesupersecretkey",
            { expiresIn: "1h" }
        );

        return {
            token,
            userId: user._id.toString(),
        };
    },

    createPost: async function ({ postInput }, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }

        const { title, content, imageUrl } = postInput;
        const errors = [];
        if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
            errors.push({ message: "Title is invalid." });
        }
        if (
            validator.isEmpty(content) ||
            !validator.isLength(content, { min: 5 })
        ) {
            errors.push({ message: "Content is invalid." });
        }

        console.log(errors);
        if (errors.length > 0) {
            const error = new Error("Invalid input.");
            error.data = errors;
            error.code = 422;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("Invalid user!");
            error.code = 401;
            throw error;
        }

        const post = await Post({
            title,
            content,
            imageUrl,
            creator: user,
        });

        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();

        return {
            ...createdPost._doc,
            _id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString(),
        };
    },

    getPosts: async function ({ page }, req) {

        if (!page) {
            page = 1;
        }

        const perPage = 2;
        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find({})
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .populate("creator");

        return {
            posts: posts.map((p) => {
                return {
                    ...p._doc,
                    _id: p._id.toString(),
                    createdAt: p.createdAt.toISOString(),
                    updatedAt: p.updatedAt.toISOString()
                };
            }),
            totalPosts,
        };
    },

    getPost: async function ({ id }, req) {
        const post = await Post.findById(id)
            .populate("creator");

        if (!post) {
            const error = new Error("No post found!");
            error.code = 404;
            throw error;
        }

        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString()
        }
    },
    updatePost: async function ({ id, postInput }, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id).populate('creator');
        if (!post) {
            const error = new Error("No post found!");
            error.code = 404;
            throw error;
        }

        if (post.creator._id.toString() !== req.userId.toString()) {
            const error = new Error("Not authorized!");
            error.code = 403;
            throw error;
        }

        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: "Title is invalid." });
        }
        if (
            validator.isEmpty(postInput.content) ||
            !validator.isLength(postInput.content, { min: 5 })
        ) {
            errors.push({ message: "Content is invalid." });
        }

        console.log(errors);
        if (errors.length > 0) {
            const error = new Error("Invalid input.");
            error.data = errors;
            error.code = 422;
            throw error;
        }
        post.title = postInput.title;
        post.content = postInput.content;

        if (postInput.imageUrl !== 'undefined') {
            post.imageUrl = postInput.imageUrl;
        }
        const updatedPost = await post.save();
        return {
            ...updatedPost._doc,
            _id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString()
        }
    },
    deletePost: async function ({ id }, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id);
        if (!post) {
            const error = new Error("No post found!");
            error.code = 404;
            throw error;
        }

        if (post.creator.toString() !== req.userId.toString()) {
            const error = new Error("Not authorized!");
            error.code = 403;
            throw error;
        }

        clearImage(post.imageUrl);
        await Post.findByIdAndDelete(id);
        const user = await User.findByIdAndUpdate(req.userId, {
            $pull: {
                posts: {
                    $in: [id]
                }
            }
        }, { new: true })
        console.log(user)
        return true;
    },
    user: async function (args, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User not found");
            error.code = 404;
            throw error;
        }
        return {
            ...user._doc,
            _id: user._id.toString()
        }
    },
    updateStatus: async function ({ status }, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }
        const user = await User.findByIdAndUpdate(req.userId, {
            $set: {
                status: status
            }
        }, { new: true });
        if (!user) {
            const error = new Error("User not found");
            error.code = 404;
            throw error;
        }

        return {
            ...user._doc,
            _id: user._id.toString()
        }
    }
};


const clearImage = (filePath) => {
    filePath = path.join(__dirname, "..", filePath);
    fs.unlink(filePath, (err) => {
        console.log(err);
    });
};
