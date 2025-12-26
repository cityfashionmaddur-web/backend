import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import storeFrontRoutes from "./routes/storeFrontRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { ENV } from "./config/env.js";


const app = express();

app.use(helmet());
const allowedOrigins = [
  ENV.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://api.cityfashionmaddur.com",
  "https://api.cityfashionmaddur.com"
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin (no origin header) and explicit allowlist
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/auth/admin', adminAuthRoutes);
app.use('/products', productRoutes);
app.use("/upload", uploadRoutes);
app.use("/store", storeFrontRoutes);
app.use("/admin", adminRoutes);
app.use("/payments", paymentRoutes);
app.use("/profile", profileRoutes);
app.use("/orders", orderRoutes);



export default app;
