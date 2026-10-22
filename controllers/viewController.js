const ViewController = {
  renderIndex(req, res) { res.render('index'); },
  renderHome(req, res) { res.render('home'); },
  renderLogin(req, res) { res.render('login'); },
  renderRegister(req, res) { res.render('register'); },
  renderVerifyEmail(req, res) { res.render('verify-email'); },
  renderForgotPassword(req, res) { res.render('forgot-password'); },
  renderResetPassword(req, res) { res.render('reset-password'); },
  renderChallenges(req, res) { res.render('challenges'); },
  renderChallengeDetails(req, res) { res.render('challenge-details'); },
  renderCollaboration(req, res) { res.render('collaboration'); },
  renderCollaborationDetails(req, res) { res.render('collaboration-details'); },
  renderApplications(req, res) { res.render('applications'); },
  renderConnect(req, res) { res.render('connect'); },
  renderCreate(req, res) { res.render('create'); },
  renderCreationDetails(req, res) { res.render('creation-details'); },
  renderMessages(req, res) { res.render('messages'); },
  renderProfile(req, res) { res.render('profile'); },
  renderSearch(req, res) { res.render('search'); },
  renderSettings(req, res) { res.render('settings'); },
  renderAdmin(req, res) {
    const section = req.params.section || 'overview';
    res.render('admin', { section });
  }
};

module.exports = ViewController;
