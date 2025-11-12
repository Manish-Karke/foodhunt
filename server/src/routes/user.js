import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const saltRounds = 10;
import User from "../models/user.js";

const userRouter = Router();

userRouter.post("/register", async (req, res) => {
  try {
    // Step 1: Check if the email already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already taken" });
    }

    // Step 2: Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    // Step 3: Create the user in the db
    const newUser = await User.create({
      ...req.body,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "User registered successfully",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
});

userRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Step 1: Find user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Step 2: Verify password
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Step 3: Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Token expires in 7 days
    );

    // Step 4: Send response WITHOUT password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      userPreferences: user.userPreferences || [],
      // Don't send password!
    };

    return res.status(200).json({
      message: "Logged in successfully",
      user: userResponse,
      isLoggedIn: true,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
});

userRouter.get("/users", async (req, res) => {
  try {
    let data;
    if (req.query.role) {
      data = await User.find({
        role: req.query.role,
        isApproved: false,
      }).select("-password"); // Don't send passwords
    } else {
      data = await User.find().select("-password");
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      message: "Failed to fetch users",
    });
  }
});

userRouter.get("/users/:id", async (req, res) => {
  try {
    const data = await User.findById(req.params.id).select("-password");
    if (!data) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      message: "Failed to fetch user",
    });
  }
});

// Fixed: Changed from POST to PATCH
userRouter.patch("/users/:id/add-preferences", async (req, res) => {
  try {
    const { userPreferences } = req.body;

    if (!userPreferences || !Array.isArray(userPreferences)) {
      return res.status(400).json({
        message: "Invalid preferences format",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.userPreferences = userPreferences;
    await user.save();

    res.status(200).json({
      message: "User preferences updated successfully",
      userPreferences: user.userPreferences,
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({
      message: "Failed to update preferences",
    });
  }
});

export default userRouter;
