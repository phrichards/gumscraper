module.exports = function(app, passport) {
	// ====================================
	// HOME PAGE (with login links) =======
	// ====================================
	app.get('/', function(req, res){
		res.render('index.ejs'); // load the index.ejs file
	});

	// ====================================
	// LOGIN ==============================
	// ====================================

	// show the login form
	app.get('/login', function(req, res){
		// render the page and pass in any flash data if it exists
		res.render('login.ejs', {message: req.flash('loginMessage')});
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/login', // redirect to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));


	// ====================================
	// PROFILE SECTION ====================
	// ====================================

	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile', isLoggedIn, function(req, res){
		res.render('profile.ejs', {
			user: req.user // get the user out of session and pass to template
		});

		// initalize spotify node api
		var SpotifyWebApi = require('spotify-web-api-node');

		// load the auth variables
		var configAuth = require('../config/auth');

		// credentials are optional
		var spotifyApi = new SpotifyWebApi({
		  clientId : configAuth.spotifyAuth.clientID,
		  clientSecret : configAuth.spotifyAuth.clientSecret,
		  redirectUri : configAuth.spotifyAuth.callbackURL
		});

		console.log(spotifyApi);

	});

	// ====================================
	// SPOTIFY ROUTES =====================
	// ====================================		

	// route for spotify authentication and login
	app.get('/auth/spotify', passport.authenticate('spotify', {scope: ['playlist-read-private', 'playlist-modify-private']}));

	// handle the callback after spotify has authenticated the user
	app.get('/auth/spotify/callback',
		passport.authenticate('spotify', {
			successRedirect: '/profile',
			failureRedirect: '/'
		}));

	// route for logging out
	app.get('/logout', function(req, res){
		req.logout();
		res.redirect('/');
	});


	// ====================================
	// LOGOUT =============================
	// ====================================	
	app.get('/logout', function(req, res){
		res.logout();
		res.redirect('/');
	});
};

// route middleware to make sure a user is logged in 

function isLoggedIn(req, res, next){
	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't, redirect them to the home page
	res.redirect('/');
};