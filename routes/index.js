const express = require('express');
const router = express.Router();
const ViewController = require('../controllers/viewController');

// Home / Landing
router.get('/', ViewController.renderIndex);
router.get('/index.html', ViewController.renderIndex);

// Home feed
router.get('/home', ViewController.renderHome);
router.get('/home.html', ViewController.renderHome);

// Auth & Verification
router.get('/login', ViewController.renderLogin);
router.get('/login.html', ViewController.renderLogin);
router.get('/register', ViewController.renderRegister);
router.get('/register.html', ViewController.renderRegister);
router.get('/verify-email', ViewController.renderVerifyEmail);
router.get('/verify-email.html', ViewController.renderVerifyEmail);
router.get('/forgot-password', ViewController.renderForgotPassword);
router.get('/forgot-password.html', ViewController.renderForgotPassword);
router.get('/reset-password', ViewController.renderResetPassword);
router.get('/reset-password.html', ViewController.renderResetPassword);

// Community & Features
router.get('/challenges', ViewController.renderChallenges);
router.get('/challenges.html', ViewController.renderChallenges);
router.get('/challenge-details', ViewController.renderChallengeDetails);
router.get('/challenge-details.html', ViewController.renderChallengeDetails);
router.get('/collaboration', ViewController.renderCollaboration);
router.get('/collaboration.html', ViewController.renderCollaboration);
router.get('/collaboration-details', ViewController.renderCollaborationDetails);
router.get('/collaboration-details.html', ViewController.renderCollaborationDetails);
router.get('/applications', ViewController.renderApplications);
router.get('/applications.html', ViewController.renderApplications);
router.get('/connect', ViewController.renderConnect);
router.get('/connect.html', ViewController.renderConnect);
router.get('/create', ViewController.renderCreate);
router.get('/create.html', ViewController.renderCreate);
router.get('/creation-details', ViewController.renderCreationDetails);
router.get('/creation-details.html', ViewController.renderCreationDetails);
router.get('/messages', ViewController.renderMessages);
router.get('/messages.html', ViewController.renderMessages);
router.get('/profile', ViewController.renderProfile);
router.get('/profile.html', ViewController.renderProfile);
router.get('/search', ViewController.renderSearch);
router.get('/search.html', ViewController.renderSearch);
router.get('/settings', ViewController.renderSettings);
router.get('/settings.html', ViewController.renderSettings);

// Admin Dashboard & Management Views
router.get('/admin', ViewController.renderAdmin);
router.get('/admin.html', ViewController.renderAdmin);
router.get('/admin/:section', ViewController.renderAdmin);

module.exports = router;
