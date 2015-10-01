

var code;

module.exports = function(app, passport) {

	// var test = 'another test';

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
	app.get('/profile', ensureAuthenticated, function(req, res){
		console.log(req.session.SpotifyAccessToken);
		res.render('profile.ejs', {
			user: req.user // get the user out of session and pass to template
		});


		
		spotifyApi.setAccessToken(req.session.SpotifyAccessToken);
	    		// res.redirect('/create');
	    	return spotifyApi.getUserPlaylists('phrichards')
					.then(function(data) {
						console.log(data);
					// console.log('Retrieved playlists', data.body);
					data.body.items.forEach(function(i){
						if (i.name.indexOf('Gumscraper') > -1) {
							console.log('yes test');
						} else {
							if (req.user) {
								console.log('logged in');
							}
							spotifyApi.createPlaylist('phrichards', 'Gumscraper', { 'public' : false })
							 	.then(function(data) {
							    	console.log(' Created playlist!');
								}, function(err) {
						    		console.log('Something went wrong!', err);
						  		});
						}
					}) 
					},function(err) {
					console.log('Something went wrong!', err);
					});
	    	});
		  	
	

	


	// ====================================
	// SPOTIFY ROUTES =====================
	// ====================================		

	// route for spotify authentication and login
	// app.get('/auth/spotify', passport.authenticate('spotify', {scope: ['playlist-read-private', 'playlist-modify-private', 'playlist-modify-public']}));

	// initalize spotify node api
	var SpotifyWebApi = require('spotify-web-api-node');

	// load the auth variables
	var configAuth = require('../config/auth');

	var passportAuth = require('../config/passport');

	var scopes = ['playlist-read-private', 'playlist-modify-private', 'playlist-modify-public'],
    	redirectUri = configAuth.spotifyAuth.callbackURL,
    	clientId = configAuth.spotifyAuth.clientID;

	// credentials are optional
	var spotifyApi = new SpotifyWebApi({
	  clientId : configAuth.spotifyAuth.clientID,
	  clientSecret : configAuth.spotifyAuth.clientSecret,
	  redirectUri : configAuth.spotifyAuth.callbackURL
	});

	var authorizeURL = spotifyApi.createAuthorizeURL(scopes);
	// console.log(authorizeURL);
	// var code = authorizeURL;


	app.get('/auth/spotify',
  		passport.authenticate('spotify', {scope: ['playlist-read-private', 'playlist-modify-private', 'playlist-modify-public']}),
  		function(req, res){
   			// The request will be redirected to spotify for authentication, so this
			// function will not be called.
		}
	);

	// handle the callback after spotify has authenticated the user
	// app.get('/auth/spotify/callback',
	// 	passport.authenticate('spotify', {
	// 		successRedirect: '/profile',
	// 		failureRedirect: '/'
	// 	})
	// );

	app.get('/auth/spotify/callback',
  		passport.authenticate('spotify', { failureRedirect: '/' }),
  		function(req, res) {
    		res.redirect('/profile');
  		});

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

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		console.log('ensureAuthenticated yes');
		return next();
	} else {
		res.redirect('/');
		console.log('not authenticated');
	}
}