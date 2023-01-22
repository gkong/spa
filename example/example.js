var rlite = require('rlite-router');
var spa = require('spa-components');

const page = document.getElementById('page');

const route = rlite(notFound, {
	'/':       homePage,
	'/about':  aboutPage,
});

var prevState = spa.init({ router: route });
route(window.location.pathname);
if (prevState != null)
	spa.scrollTo(prevState.scrollx, prevState.scrolly);

function homePage() {
	document.title = "home";
	page.innerHTML = `
		<h1>Home</h1>
		<a href="/about">About Page (via browser navigation)</a> <br/> <br/>
		<button id="aButton" type="button">About Page (via script)</button>
		`;
	document.getElementById('aButton').onclick = function() { spa.visit('/about'); };
}

function aboutPage() {
	document.title = "about";
	page.innerHTML = '<h1>About</h1> <a href="/">Home Page</a>';
}

function notFound() {
	document.title = "notfound";
	page.innerHTML = '<h1>404</h1>';
}
