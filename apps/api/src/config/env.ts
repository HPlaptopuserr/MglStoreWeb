import dotenv from "dotenv";
import path from "path";

// Load environment variables before any route or middleware module reads them.
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();
