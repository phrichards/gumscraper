module.exports = function(playlist-builder) {

	var SpotifyWebApi = require('spotify-web-api-node');

	// load the auth variables
	var configAuth = require('./auth');

	// credentials are optional
	var spotifyApi = new SpotifyWebApi({
	  clientId : configAuth.spotifyAuth.clientID,
	  clientSecret : configAuth.spotifyAuth.clientSecret,
	  redirectUri : configAuth.spotifyAuth.callbackURL
	});

	console.log('builder');
}