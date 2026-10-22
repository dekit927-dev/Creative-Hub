const ViewController = {
  renderIndex(req, res) { res.render('index'); },
  renderHome(req, res) { res.render('home'); },
  renderLogin(req, res) { res.render('login'); },
  renderRegister(req, res) { res.render('register'); },
  renderChallenges(req, res) { res.render('challenges'); },
  renderCollaboration(req, res) { res.render('collaboration'); },
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
