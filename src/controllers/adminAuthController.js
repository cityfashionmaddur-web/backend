import { ENV } from "../config/env.js";
import { generateJwt } from "../utils/generateJwt.js";

export async function adminPasswordLogin(req, res) {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ message: "userId and password are required" });
    }

    if (userId !== ENV.ADMIN_USER_ID || password !== ENV.ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateJwt({
      id: userId,
      role: "ADMIN",
      name: "Admin"
    });

    res.cookie("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: ENV.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ token, user: { id: userId, role: "ADMIN", name: "Admin" } });
  } catch (err) {
    console.error("adminPasswordLogin error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function adminLogout(req, res) {
  try {
    res.clearCookie("admin_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: ENV.NODE_ENV === "production",
      path: "/"
    });
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("adminLogout error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
