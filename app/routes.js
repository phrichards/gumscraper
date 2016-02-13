// initalize spotify node api
var SpotifyWebApi = require('spotify-web-api-node');

var _ = require('underscore-node');
var _s = require('underscore.string');
var async = require('async');

var hbs = require('hbs');
var q = require('q');


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

	// var test = 'another test';

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
		console.log('this is scrape');
		console.log(req.session.SpotifyAccessToken);
		res.render('scrape.html', {
			user: req.user, // get the user out of session and pass to template
			playlistID: playlistID,
			playlistURL: playlistURL
		});

		spotifyApi.setAccessToken(req.session.SpotifyAccessToken);
		exists = false;
		username = req.user.spotify['id'];
		getUserPlaylists(username, req, res, next);
	});

	app.get('/profile', function(req, res){
		res.render('profile.html');
	});
};

// route middleware to make sure a user is logged in 

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		console.log('ensureAuthenticated yes');
		return next();
	} else {
		res.redirect('/');
		console.log('not authenticated');
	}
}

// Playlist building starts

function getUserPlaylists(username){
	console.log(username);
	spotifyApi.getUserPlaylists(username)
		.then(function(data) {
			console.log('playlists retrieved');
			console.log(data);
			// hbs.localsAsTemplateData(app);

			// Loop through playlist objects in api response and create array of titles
			var playlists = data.body.items;

			// Find out if playlist exists
			// This will return an array of one item if it exists

			var alreadyExists = playlists.filter(function(el){
				return (el.name === 'Gumscraper');
			});

			// If it exists, get the ID

			if (alreadyExists.length) {
				console.log('already Exists');
				playlistURL = alreadyExists[0].external_urls['spotify'];
				playlistID = alreadyExists[0].id;
				// app.locals.playlistURL = playlistURL;
				// app.locals.playlistID = playlistID;
				getLatestList();
			} else {
				console.log('doesnt exist');
				spotifyApi.createPlaylist(username, 'Gumscraper', { 'public' : false })
			 	.then(function(data) {
			    	console.log('Created playlist!');
			    	playlistURL = data.body.external_urls['spotify'];
					playlistID = data.body.id;
					// app.locals.playlistURL = playlistURL;
					// app.locals.playlistID = playlistID;
					getLatestList();
				}, function(err) {
		    		console.log('Something went wrong!', err);
		  		});
			}
		},function(err) {
			console.log('Something went wrong!', err);
		});
}

function getLatestList() {
	console.log('getLatestList called');
	var deferred = q.defer();
	var request = require('request');
	var cheerio = require ('cheerio');
	var fs = require('fs');

	// Url to scrape

	url = 'http://www.stereogum.com/category/franchises/the-5-best-songs-of-the-week/';

	// url = 'http://www.stereogum.com/1839386/the-5-best-songs-of-the-week-116/franchises/the-5-best-songs-of-the-week/';

	var $ = cheerio.load(url);

	request(url, function(error, resopnse, html){
		console.log('request called');
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
				console.log(postLink);
				
				scrape(postLink);
			});
		}
	});
}

function scrape(page) {

	console.log('page: ' + page);
	console.log('ID: ' + playlistID);

	// var playlistID = id;

	var request = require('request');
	var cheerio = require ('cheerio');
	var fs = require('fs');

	// Url to scrape

	url = page;
	var $ = cheerio.load(url);

	request(url, function(error, resopnse, html){
		console.log('request called');
		// First check to make sure no errors occur when making the request

		if (!error){
			// Next, use Cheerio library on the returned html which will give us jQuery functionality

			var $ = cheerio.load(html);

			// Finally, define the variables to capture

			var song;
			var json = {song: ''};
			var initialArray = [];
			var songArray = [];
			var spotifyIdArray = [];
			var trackArray = [];
			
			
			songs = $('.article-content h3');

			$('.article-content').filter(function(){
				// Let's store the data we filter into a variable so we can see what's going on 

				var data = $(this);

				songString = data.find('h3').text().split(',');
				parseSongs(songString);
			})

			function parseSongs(data) {
				console.log('parsesongs called');
				console.log(data[0]);
				var songArray = data[0].split(/[0-9]\.\s/);
				console.log(songArray);
				checkPlaylist(songArray);
			}
		}
	})
};

// Check to see if the songs that we've scraped are already on the Spotify playlist
function checkPlaylist(songs) {
	console.log('checkplaylist called');
	spotifyApi.getPlaylist(username, playlistID)
	  .then(function(data) {
	  	var playlistSongIDs = _.map(data.body.tracks.items, function(item){
	  		return (item.track.id);
	  	});
	  	getSongs(songs, playlistSongIDs);
	  }, function(err) {
	    console.log('Something went wrong!', err);
	  });
}

// Search Spotify for songs in the array
function getSongs(songs, playlistSongIDs){
	var count = 0;
	var newSongs = [];
	console.log('getsongs called');
	_.each(songs, function(song) {
		if (song.length) {
			spotifyApi.searchTracks(song)
	  		.then(function(data) {
	  			console.log(song);
	    		if (!_.contains(playlistSongIDs, data.body.tracks.items[0].id)) {
	    			addToPlaylist(data.body.tracks.items[0].id);
	    		} else {
    				console.log('already on');
	    		}
	  		}, function(err) {
	    		console.error(err);
	  		});
		}
	});
	console.log('done');
}

// Add the found songs to the playlist
function addToPlaylist(songID) {
	console.log('addToPlaylist called');
	console.log('playlist id: ' + playlistID);
	console.log('song id: ' + songID);

	spotifyApi.addTracksToPlaylist(username, playlistID, ["spotify:track:" + songID])
	  .then(function() {
	    console.log('Added tracks to playlist!');
	  }, function(err) {
	    console.log('Something went wrong!', err);
	});
}