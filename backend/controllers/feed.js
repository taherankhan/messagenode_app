const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator/check");

const Post = require("../models/post");
const User = require("../models/user");

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;

    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate("creator")
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        if (!posts) {
            const error = new Error("Could not find product.");
            error.statusCode = 422;
            throw error;
        }
        res.status(200).json({
            message: "Fetched posts successfully",
            posts: posts,
            totalItems: totalItems,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error("validation failed,entered data is incorrect");
        error.statusCode = 422;
        throw error;
    }

    if (!req.file) {
        const error = new Error("No image provided.");
        error.statusCode = 422;
        throw error;
    }

    const imageUrl = req.file.path;
    const { title, content } = req.body;
    let creator;

    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId,
    });

    try {
        await post.save();
        const user = await User.findById(req.userId);
        user.posts.push(post);
        await user.save();

        res.status(201).json({
            message: "Post created successfully",
            post: post,
            creator: {
                _id: user._id,
                name: user.name,
            },
        });
    } catch (error) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error("Could not find product.");
            error.statusCode = 422;
            throw error;
        }
        res.status(200).json({
            message: "Post fetched.",
            post: post,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error("validation failed,entered data is incorrect");
        error.statusCode = 422;
        throw error;
    }

    let imageUrl = req.body.image;
    const { title, content } = req.body;
    const postId = req.params.postId;

    if (req.file) {
        imageUrl = req.file.path;
    }
    if (!imageUrl) {
        const error = new Error("No file picked.");
        error.statusCode = 422;
        throw error;
    }

    try {
        const post = await Post.findById(postId).populate('creator');
        if (!post) {
            const error = new Error("Could not find product.");
            error.statusCode = 422;
            throw error;
        }
        if (post.creator._id.toString() !== req.userId) {
            const error = new Error("You are not authorized to perform this action.");
            error.statusCode = 403;
            throw error;
        }
        if (imageUrl != post.imageUrl) {
            clearImage(post.imageUrl);
        }
        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        const result = await post.save();

        res.status(200).json({
            message: "Post updated successfully",
            post: result,

        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
    }
};

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId;

    try {
        const post = await Post.findById(postId)
        if (!post) {
            const error = new Error("Could not find product.");
            error.statusCode = 422;
            throw error;
        }
        //chek logged in user
        clearImage(post.imageUrl);
        await Post.findByIdAndDelete(postId);
        const user = await User.findById(req.userId);
        user.posts.pull(postId);
        await user.save();

        res.status(200).json({
            message: "Post deleted successfully",
            post: result,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

const clearImage = (filePath) => {
    filePath = path.join(__dirname, "..", filePath);
    fs.unlink(filePath, (err) => {
        console.log(err);
    });
};
