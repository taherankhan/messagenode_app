const User = require("../models/user");

const { validationResult } = require("express-validator/check");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signup = (req, res, next) => {
    const { name, email, password } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error("validation failed,entered data is incorrect");
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }

    bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
            const user = new User({
                email,
                name,
                password: hashedPassword,
            });
            return user.save();
        })
        .then((result) => {
            res.status(200).json({
                message: "User Created!!",
                userId: result._id,
            });
        })
        .catch((err) => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
};

exports.login = (req, res, next) => {
    const { email, password } = req.body;
    let loadedUser;

    User.findOne({ email })
        .then((user) => {
            if (!user) {
                const error = new Error("Could not find the user.");
                error.statusCode = 401; //not authenticated
                throw error;
            }

            loadedUser = user;
            return bcrypt.compare(password, user.password);
        })
        .then((isEqual) => {
            if (!isEqual) {
                const error = new Error("Wrong Password!");
                error.statusCode = 401; //not authenticated
                throw error;
            }

            const token = jwt.sign(
                {
                    email: loadedUser.email,
                    userId: loadedUser._id.toString(),
                },
                "somesupersecretkey",
                { expiresIn: "1h" }
            );
            res.status(200).json({
                token,
                userId: loadedUser._id.toString(),
            })
        })
        .catch((err) => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
};
