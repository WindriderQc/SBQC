const { ObjectId } = require('mongodb');

// Handle index actions
exports.index = async (req, res) => {
    try {
        const usersCollection = req.app.locals.collections.users;
        if (!usersCollection) {
            return res.status(500).json({ status: "error", message: "Users collection not available." });
        }
        const users = await usersCollection.find({}).toArray();
        res.json({
            status: "success",
            message: "Users retrieved successfully",
            data: users
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Error retrieving users.",
            details: err.message
        });
    }
};

// Handle create actions
exports.new = async (req, res) => {
    try {
        const usersCollection = req.app.locals.collections.users;
        if (!usersCollection) {
            return res.status(500).json({ status: "error", message: "Users collection not available." });
        }

        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ status: "error", message: "Name, email, and password are required." });
        }

        const newUser = {
            name,
            email,
            password, // Note: Password should be hashed in a real application
            lat: req.body.lat || "00.00",
            lon: req.body.lon || "00.00",
            creationDate: new Date(),
            lastConnectDate: new Date()
        };

        const result = await usersCollection.insertOne(newUser);
        res.json({
            status: "success",
            message: 'New user created!',
            data: { ...newUser, _id: result.insertedId }
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "An error occurred during user creation.",
            details: err.message
        });
    }
};

// Handle view info
exports.view = async (req, res) => {
    try {
        const usersCollection = req.app.locals.collections.users;
        if (!usersCollection) {
            return res.status(500).json({ status: "error", message: "Users collection not available." });
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(req.params.user_id) });

        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found." });
        }

        res.json({
            status: "success",
            message: 'User details retrieved successfully.',
            data: user
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Error retrieving user.",
            details: err.message
        });
    }
};

// Handle update info
exports.update = async (req, res) => {
    try {
        const usersCollection = req.app.locals.collections.users;
        if (!usersCollection) {
            return res.status(500).json({ status: "error", message: "Users collection not available." });
        }

        const { name, gender, email, phone } = req.body;
        const updateData = {
            $set: {
                name,
                gender,
                email,
                phone,
                lastConnectDate: new Date()
            }
        };

        const result = await usersCollection.updateOne({ _id: new ObjectId(req.params.user_id) }, updateData);

        if (result.matchedCount === 0) {
            return res.status(404).json({ status: "error", message: "User not found." });
        }

        res.json({
            status: "success",
            message: 'User Info updated'
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Error updating user.",
            details: err.message
        });
    }
};

// Handle delete
exports.delete = async (req, res) => {
    try {
        const usersCollection = req.app.locals.collections.users;
        if (!usersCollection) {
            return res.status(500).json({ status: "error", message: "Users collection not available." });
        }

        const result = await usersCollection.deleteOne({ _id: new ObjectId(req.params.user_id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ status: "error", message: "User not found." });
        }

        res.json({
            status: "success",
            message: 'User deleted'
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Error deleting user.",
            details: err.message
        });
    }
};

// Handle view by email
exports.viaEmail = async (req, res) => {
    try {
        const usersCollection = req.app.locals.collections.users;
        if (!usersCollection) {
            return res.status(500).json({ status: "error", message: "Users collection not available." });
        }

        const user = await usersCollection.findOne({ email: req.params.email });

        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found." });
        }

        res.json({
            status: "success",
            message: `User found via email: ${req.params.email}`,
            data: user
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Error retrieving user by email.",
            details: err.message
        });
    }
};

// Handle delete by email from params
exports.deleteViaEmail = async (req, res) => {
    try {
        const usersCollection = req.app.locals.collections.users;
        if (!usersCollection) {
            return res.status(500).json({ status: "error", message: "Users collection not available." });
        }

        const result = await usersCollection.deleteOne({ email: req.params.email });

        if (result.deletedCount === 0) {
            return res.status(404).json({ status: "error", message: "User not found." });
        }

        res.json({
            status: "success",
            message: 'User deleted via email in params',
            data: result
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Error deleting user by email.",
            details: err.message
        });
    }
};

// Handle delete by email from body
exports.deleteViaEmailbody = async (req, res) => {
    try {
        const usersCollection = req.app.locals.collections.users;
        if (!usersCollection) {
            return res.status(500).json({ status: "error", message: "Users collection not available." });
        }

        const result = await usersCollection.deleteOne({ email: req.body.email });

        if (result.deletedCount === 0) {
            return res.status(404).json({ status: "error", message: "User not found." });
        }

        res.json({
            status: 'success',
            message: 'User deleted via email in form body',
            data: result
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Error deleting user by email.",
            details: err.message
        });
    }
};