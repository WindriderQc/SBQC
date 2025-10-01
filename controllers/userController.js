// userController.js
// Import contact model
User = require('../models/userModel');
// Handle index actions
exports.index = function (req, res) {
    User.get(function (err, users) {
        if (err) {
            res.json({
                status: "error",
                message: err,
            });
        }
        res.json({
            status: "success",
            message: "Users retrieved successfully",
            data: users
        });
    });
};
// Handle create  actions
exports.new = function (req, res) {
    var user = new User();
    user.name = req.body.name ? req.body.name : user.name;
    user.email = req.body.email;
   
    // save the contact and check for errors
    user.save(function (err) {
        // Check for validation error
        if (err) {
            res.status(500).json({
                status: "error",
                message: "An error occurred during user creation.",
                details: err.message
            });
        } else {
            res.json({
                status: "success",
                message: 'New user created!',
                data: user
            });
        }
    });
};
// Handle view  info
exports.view = function (req, res) {
    User.findById(req.params.user_id, function (err, user) {
        if (err) {
            return res.status(500).json({
                status: "error",
                message: "Error retrieving user.",
                details: err.message
            });
        }
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "User not found."
            });
        }
        res.json({
            status: "success",
            message: 'User details retrieved successfully.',
            data: user
        });
    });
}

// Handle update  info
exports.update = (req, res) => {
    User.findById(req.params.user_id, (err, user) => {
        if (err) {
            return res.status(500).json({
                status: "error",
                message: "Error finding user to update.",
                details: err.message
            });
        }
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "User not found."
            });
        }
        user.name = req.body.name ? req.body.name : user.name;
        user.gender = req.body.gender;
        user.email = req.body.email;
        user.phone = req.body.phone;
        // save and check for errors
        user.save(function (err) {
            if (err) {
                return res.status(500).json({
                    status: "error",
                    message: "Error saving updated user.",
                    details: err.message
                });
            }
            res.json({
                status: "success",
                message: 'User Info updated',
                data: user
            });
        });
    });
}

// Handle delete 
exports.delete =  (req, res) => {
    User.remove({
        _id: req.params.user_id
    }, function (err, contact) {
        if (err) {
            return res.status(500).json({
                status: "error",
                message: "Error deleting user.",
                details: err.message
            });
        }
        res.json({
            status: "success",
            message: 'User deleted'
        });
    });
}




exports.viaEmail = (req, res) => {
    User.findOne({ email: req.params.email }, (err, foundUser) => {
        if (err) {
            return res.status(500).json({
                status: "error",
                message: "Error retrieving user by email.",
                details: err.message
            });
        }
        if (!foundUser) {
            return res.status(404).json({
                status: "error",
                message: "User not found."
            });
        }
        res.json({
            status: "success",
            message: `User found via email: ${req.params.email}`,
            data: foundUser
        });
    });
}



exports.deleteViaEmail = (req, res) => {
    console.log('Request to delete user via email: ', req.params.email )
    User.deleteOne({ email: req.params.email }, (err, foundUser) => {
        if (err) {
            return res.status(500).json({
                status: "error",
                message: "Error deleting user by email.",
                details: err.message
            });
        }
        res.json({
            status: "success",
            message: 'User deleted via email in params',
            data: foundUser
        });
    });
}



exports.deleteViaEmailbody = (req, res) => {
    console.log('Request to delete user via email: ', req.body.email )
    User.deleteOne({ email: req.body.email }, (err, foundUser) => {
        if (err) {
            return res.status(500).json({
                status: "error",
                message: "Error deleting user by email.",
                details: err.message
            });
        }
        res.json({
            status: 'success',
            message: 'User deleted via email in form body',
            data: foundUser
        });
    });
}



