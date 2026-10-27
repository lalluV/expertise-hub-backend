"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = __importDefault(require("./config/db"));
const env_1 = require("./config/env");
const app_1 = require("./app");
// Fail fast on missing/weak configuration (values are never printed).
let env;
try {
    env = (0, env_1.loadEnv)();
}
catch (err) {
    console.error(err.message);
    process.exit(1);
}
(0, db_1.default)();
const server = (0, app_1.createApp)().listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT} (${env.NODE_ENV})`);
});
const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
        void mongoose_1.default.connection.close().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
