import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

export const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const optionalAuthMiddleware = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    req.userId = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
  } catch (error) {
    req.userId = null;
  }
  next();
};

export default { generateToken, verifyToken, authMiddleware, optionalAuthMiddleware };