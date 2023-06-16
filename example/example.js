var rlite = require('rlite-router');
var spa = require('spa-components');

const clientVersion = "1";

const page = document.getElementById('page');

// declarations of "pages" with their client-internal URL paths
// and the JavaScript functions which implement them
const route = rlite(notFound, {
	'/':       homePage,
	'/about':  aboutPage,
});

// here we create a function named get() which we can use to issue REST API GET requests,
// including our middleware functions which implement automatic client version update
// by sending the client version with every request and looking for an "update-yourself"
// directive in every response from the back end.
var get = spa.httpReqFunc("GET", "", reqCB, beforeCB, beforeCB, undefined);

var prevState = spa.init({ router: route });
route(window.location.pathname);
if (prevState != null)
	spa.scrollTo(prevState.scrollx, prevState.scrolly);

function homePage() {
	document.title = "home";
	page.innerHTML = `
		<h1>Home</h1>
		<a href="/about">About Page (via browser navigation)</a> <br/> <br/>
		<button id="aButton" type="button">About Page (via script)</button> <br/> <br/>
		<button id="pingButton" type="button">ping the server</button>
		<span id="pingMessage">ping received</span>
		`;
	document.getElementById('aButton').onclick = function() { spa.visit('/about'); };

	var pm = document.getElementById('pingMessage');
	pm.style.visibility = "hidden";
	pm.style.padding = "0 0 0 40px";
	document.getElementById('pingButton').onclick = function() {
		// REST API call
		get("/ping").then(function(okXHR) {
			pm.style.visibility = "visible";
			setTimeout(() => { pm.style.visibility = "hidden"}, 1000);
		});
	};
}

function aboutPage() {
	document.title = "about";
	page.innerHTML = '<h1>About</h1> <a href="/">Home Page</a>';
}

function notFound() {
	document.title = "notfound";
	page.innerHTML = '<h1>404</h1>';
}

function reqCB(req, method, url) { 
	req.setRequestHeader("Client-Version", clientVersion);
}

function beforeCB(resp, method, url) {
	if (resp.getResponseHeader("Client-Update-Required") === "true") {
		alert("Due to a server software upgrade, this app will now be reloaded.");
		history.replaceState({}, "", "/");
		window.location.reload(true);
	}	
}
