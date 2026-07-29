import dotenv from "dotenv";
import path from "path";

// Load the workspace root environment before route modules initialize.
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();
