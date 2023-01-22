# spa - zero-dependency single-page app front-end components

This module provides history and scroll position management. Add a client-side router, to complete the basic plumbing of a single-page app.

## features
- manages the browser history stack. Forward and back buttons work as expected, both for script-initiated browsing, via `spa.visit()`, and for browsing initiated via user clicks on anchor tags.
- manages scroll position, so moving forward or backward in the history stack shows pages scrolled to where you left them, even if the browser has scrolled back to the top of the page or completely re-initialized JavaScript.
- zero dependencies. Minified and gzipped, it occupies less than 1000 bytes. When used together with zero-dependency client-side router, `rlite-router`, it makes a bundle of less than 1800 bytes.

## API

	// if we have already loaded and rendered one or more pages, and the browser is now 
	// re-starting us, spa.init() returns an object containing previously-saved scrollx
	// and scrolly values, so we can restore the scroll state, otherwise, it returns null.

	spa.init({
		router: function(path) {},   // function to execute client-side routes
		logging: boolean             // send log messages via console.log()
	});

	spa.visit(path);                 // visit a page, pushing it onto the history stack

	spa.replace(path);               // visit a page, replacing the current page in the history stack

	spa.scrollTo(targetx, targety);  // call this to restore scroll position after spa.init(), if necessary

## example

The following example, included in the `example` directory, implements a minimal single-page app, with two pages, Home and About, with page navigation, history management, and deep link handling (which requires server support, see below). This example uses `rlite-router`, but you can use any client-side router.

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


## run the example

The `example` directory includes:
- the above example and a minimal `index.html`
- the above example bundled via browserify
- a very simple server implemented in 15 lines of golang code, which serves `index.html` for all routes other than a single javascript bundle, thereby giving the front end the opportunity to handle deep links.

To run the example:

	# install golang from go.dev
	cd examples
	go mod init server
	go build
	./server
	# visit http://localhost:8000 in a web browser.
	# navigate between the two available pages, home and about, to observe history management.
	# visit http://localhost:8000/about to observe deep link handling.

## install

	npm install git://github.com/gkong/spa.git#main

