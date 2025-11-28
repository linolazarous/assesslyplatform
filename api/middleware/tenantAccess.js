// middleware/tenantAccess.js
export const tenantAccess = (req, res, next) => {
    const userOrg = req.user.organizationId;
    const requestOrg = req.params.orgId || req.body.organizationId;

    if (!requestOrg) {
        return res.status(400).json({
            success: false,
            message: "organizationId is required"
        });
    }

    if (String(userOrg) !== String(requestOrg)) {
        return res.status(403).json({
            success: false,
            message: "Unauthorized: cross-organization access denied."
        });
    }

    next();
};
