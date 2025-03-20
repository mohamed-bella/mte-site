// middleware/security.js
const crypto = require('crypto');
const express = require('express');

// Simple CSRF protection middleware
exports.csrfProtection = (req, res, next) => {
    // For GET requests, generate a new token
    if (req.method === 'GET') {
        const csrfToken = crypto.randomBytes(16).toString('hex');
        req.session.csrfToken = csrfToken;
        req.csrfToken = () => csrfToken;
        return next();
    }
    
    // For POST, PUT, DELETE requests, validate token
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const bodyToken = req.body._csrf;
        const sessionToken = req.session.csrfToken;
        
        if (!bodyToken || !sessionToken || bodyToken !== sessionToken) {
            return res.status(403).render('error', {
                title: 'Forbidden',
                message: 'CSRF token validation failed',
                error: { status: 403 }
            });
        }
        
        req.csrfToken = () => sessionToken;
        return next();
    }
    
    // For other methods
    next();
};

// Security headers middleware
exports.securityHeaders = (req, res, next) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://code.jquery.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; img-src 'self' data: https:; connect-src 'self'");
    
    next();
}; 