"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toInitialsName = toInitialsName;
exports.publicExpertName = publicExpertName;
exports.canSeeRealExpertIdentity = canSeeRealExpertIdentity;
exports.shapeExpertForViewer = shapeExpertForViewer;
const User_1 = require("../models/User");
/** "Alex Rivera" -> "Alex R."; "Alex" -> "Alex". */
function toInitialsName(fullName) {
    const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return "Expert";
    if (parts.length === 1)
        return parts[0];
    const last = parts[parts.length - 1];
    return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}
/** Name that is safe to show to customers / the public. */
function publicExpertName(expert) {
    if (!expert)
        return "Expert";
    if (expert.hideName) {
        return expert.displayName?.trim() || toInitialsName(expert.name);
    }
    return expert.name?.trim() || expert.displayName?.trim() || "Expert";
}
/** Admin and the expert themselves see the real name. */
function canSeeRealExpertIdentity(viewer, expertId) {
    if (!viewer)
        return false;
    if (viewer.role === User_1.UserRole.ADMIN)
        return true;
    return (viewer.role === User_1.UserRole.EXPERT &&
        viewer._id !== undefined &&
        String(viewer._id) === String(expertId));
}
const INTERNAL_FIELDS = [
    "password",
    "readNotificationIds",
    "declinedRequestIds",
    "__v",
];
/**
 * Shapes an expert (plain object or mongoose doc) for a viewer.
 * - admin / the expert themselves: everything except secrets, real name
 * - everyone else: `name` is the public name when hideName is true.
 *   Phone and email are always removed. Internal fields are always removed.
 */
function shapeExpertForViewer(expert, viewer) {
    if (!expert)
        return expert;
    // A bare ObjectId (unpopulated ref) carries no name; leave untouched.
    if (expert._bsontype)
        return expert;
    const plain = typeof expert.toObject === "function"
        ? { ...expert.toObject() }
        : { ...expert };
    const privileged = canSeeRealExpertIdentity(viewer, plain._id);
    if (!privileged) {
        for (const key of INTERNAL_FIELDS)
            delete plain[key];
        delete plain.phone;
        delete plain.email;
        if (plain.hideName) {
            const shown = publicExpertName(plain);
            plain.name = shown;
            plain.displayName = shown;
        }
    }
    else {
        delete plain.password;
    }
    return plain;
}
