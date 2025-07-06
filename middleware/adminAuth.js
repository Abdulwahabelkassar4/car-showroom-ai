function isLoggedIn(req, res, next) {
    console.log('Session check:', req.session);
    if (req.session && req.session.user) return next();
    return res.redirect('/login'); // or res.status(401) for API
  }
  
  function isAdmin(req, res, next) {
    console.log('Admin check:', {
        hasSession: !!req.session,
        hasUser: !!(req.session && req.session.user),
        userRole: req.session?.user?.role
    });
    
    if (req.session && req.session.user && req.session.user.role === 'admin') {
      return next();
    }
    return res.redirect('/login');  // Changed to redirect to login instead of sending 403
  }
  
  module.exports = {
    isLoggedIn,
    isAdmin
  };
  