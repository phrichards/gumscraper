// initalize spotify node api
var SpotifyWebApi = require('spotify-web-api-node');

var _ = require('underscore-node');
var _s = require('underscore.string');
var async = require('async');

var hbs = require('hbs');
var q = require('q');
var fetch = require('node-fetch');


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

var playlistID;
var playlistURL;
var username;

module.exports = function(app, passport) {

	// ====================================
	// HOME PAGE (with login links) =======
	// ====================================
	app.get('/', function(req, res){
		res.render('index.html'); // load the index.html file
	});

	// ====================================
	// SPOTIFY ROUTES =====================
	// ====================================		

	app.get('/auth/spotify',
  		passport.authenticate('spotify', {scope: ['playlist-read-private', 'playlist-modify-private', 'playlist-modify-public']}),
  		function(req, res){
   			// The request will be redirected to spotify for authentication, so this
			// function will not be called.
		}
	);

	app.get('/auth/spotify/callback',
  		passport.authenticate('spotify', { failureRedirect: '/' }),
  		function(req, res) {
    		res.redirect('/scrape');
  		}
  	);

	// ====================================
	// SCRAPE SECTION =====================
	// ====================================

	app.get('/scrape', ensureAuthenticated, function(req, res, next){

		spotifyApi.setAccessToken(req.session.SpotifyAccessToken);
		exists = false;
		username = req.user.spotify['id'];
		req.username = username;
		app.set('username', username);
		res.redirect('/playlist');
	});

	app.get('/playlist', getUserPlaylists, getLatestList, scrape, checkPlaylist, getSongs, function(req, res, next){
		res.render('playlist.html', {
			user: req.user, // get the user out of session and pass to template
			playlistID: playlistID,
			playlistURL: playlistURL
		});
	});
};

// route middleware to make sure a user is logged in 

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	} else {
		res.redirect('/');
	}
}

// Playlist building starts

function getUserPlaylists(req, res, next){
	// var username = app.get('username');
	console.log(username);
	spotifyApi.getUserPlaylists(username)
		.then(function(data) {
			// Loop through playlist objects in api response and create array of titles
			var playlists = data.body.items;

			// Find out if playlist exists
			// This will return an array of one item if it exists
			var alreadyExists = playlists.filter(function(el){
				return (el.name === 'Gumscraper');
			});

			// If it exists, get the ID

			if (alreadyExists.length) {
				playlistURL = alreadyExists[0].external_urls['spotify'];
				playlistID = alreadyExists[0].id;
				return next();
			} else {
				console.log('doesnt exist');
				spotifyApi.createPlaylist(username, 'Gumscraper', { 'public' : false })
			 	.then(function(data) {
			    	console.log('Created playlist!');
			    	playlistURL = data.body.external_urls['spotify'];
					playlistID = data.body.id;
					return next();
				}, function(err) {
		    		console.log('Something went wrong!', err);
		  		});
			}
		},function(err) {
			console.log('Something went wrong!', err);
		});
}

function getLatestList(req, res, next) {
	var request = require('request');
	var cheerio = require ('cheerio');

	// Url to scrape

	url = 'http://www.stereogum.com/category/franchises/the-5-best-songs-of-the-week/';

	var $ = cheerio.load(url);

	request(url, function(error, response, html){
		// First check to make sure no errors occur when making the request

		if (!error){
			// Next, use Cheerio library on the returned html which will give us jQuery functionality

			var $ = cheerio.load(html);

			// Finally, define the variables to capture

			var Linklist;

			linkList = $('.left-col');

			linkList.filter(function(){
				// Let's store the data we filter into a variable so we can see what's going on 

				var data = $(this);

				// songString = data.find('h3').text().split(/(\d)/g);
				postLink = data.find('.post.row').children('.preview-holder').first().children('a').attr('href');
				
				// scrape(postLink, req, res, next);
				return next();
			});
		}
	});
}

function scrape(req, res, next) {

	var request = require('request');
	var cheerio = require ('cheerio');
	var fs = require('fs');

	// Url to scrape

	url = postLink;
	var $ = cheerio.load(url);

	request(url, function(error, resopnse, html){
		// First check to make sure no errors occur when making the request

		if (!error){
			// Next, use Cheerio library on the returned html which will give us jQuery functionality

			var $ = cheerio.load(html);
			songs = $('.article-content h3');

			$('.article-content').filter(function(){
				// Let's store the data we filter into a variable so we can see what's going on 

				var data = $(this);

				songs = data.find('h3').text().split(',');
				songArray = songs[0].split(/[0-9]\.\s/);
				return next();

			});
		}
		
	})
};

// Check to see if the songs that we've scraped are already on the Spotify playlist
function checkPlaylist(req, res, next) {
	spotifyApi.getPlaylist(username, playlistID)
	  .then(function(data) {
	  	req.playlistSongIDs = _.map(data.body.tracks.items, function(item){
	  		return (item.track.id);
	  	});
	  	return next();
	  }, function(err) {
	    console.log('Something went wrong!', err);
	  });
}

// Search Spotify for songs in the array
function getSongs(req, res, next){
	var count = 0;
	var newSongs = [];
	_.each(songArray, function(song) {
		if (song.length) {
			spotifyApi.searchTracks(song)
	  		.then(function(data) {
	    		if (!_.contains(req.playlistSongIDs, data.body.tracks.items[0].id)) {
	    			addToPlaylist(data.body.tracks.items[0].id, req, res, next);
	    		} else {
    				console.log('already on');
	    		}
	    		return next();
	  		}, function(err) {
	    		console.error(err);
	  		});
		} 
	});
}

// Add the found songs to the playlist
function addToPlaylist(songID) {

	spotifyApi.addTracksToPlaylist(username, playlistID, ["spotify:track:" + songID])
	  .then(function() {
	    console.log('Added tracks to playlist!');
	  }, function(err) {
	    console.log('Something went wrong!', err);
	});
}