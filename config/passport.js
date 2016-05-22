// load all the things we need
var LocalStrategy = require('passport-local').Strategy;
var SpotifyStrategy = require('passport-spotify').Strategy;

// load up the user model
var User = require('../app/models/user');

// load the auth variables
var configAuth = require('./auth');

// expose this function to our app using module.exports
module.exports = function(passport) {

	// ===========================================
	// passport session setup ====================
	// ===========================================
	// required for persistent login sessions
	// passport needs ability to serialize and unserialize users out of session

	// used to serialize the user for the session
	passport.serializeUser(function(user, done){
		done(null, user.id);
	});

	// used to deserialize the user
	passport.deserializeUser(function(id, done){
		User.findById(id, function(err, user){
			done(err, user);
		});
	});


	// ===========================================
	// SPOTIFY ==================================
	// ===========================================
	passport.use(new SpotifyStrategy({

		// pull in our app id and secret from our auth.js file
		clientID: configAuth.spotifyAuth.clientID,
		clientSecret: configAuth.spotifyAuth.clientSecret,
		callbackURL: configAuth.spotifyAuth.callbackURL,
		passReqToCallback: true
	},

	// spotify will send back the token and profile
	function(req, token, refreshToken, profile, done) {
		console.log('token: ' + token);

		// asynchronous
		process.nextTick(function(){

			req.session.SpotifyAccessToken = token;
			req.session.SpotifyRefreshToken = refreshToken;

			// find the user in the database based on their spotify id
			User.findOne({'spotify.id' : profile.id}, function(err, user){

				// if there is an error, stop everything and return that
				// ie an error connecting to the database
				if (err)
					return done(err);

				// if the user is found, then log them in
				if (user) {
					return done(null, user, token); // user found, return that user
				} else {
					// if there is no user found with that spotify id, create them
					var newUser = new User();

					// set all of the spotify information in our user model
					newUser.spotify.id = profile.id // set the user's spotify id

					// save our user to the database
					newUser.save(function(err) {
						if (err)
							throw err;

						// if successful, return the new user
						return done(null, newUser, token);
					});
				}
			});
		

		});

	}));
};