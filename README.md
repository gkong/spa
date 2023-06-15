# spa - zero-dependency single-page app front-end components

This module provides history and scroll position management and a simple XMLHttpRequest wrapper.
Add a client-side router, to complete the basic plumbing of a single-page app.

## features
- manages the browser history stack, for script-initiated browsing, via `spa.visit()`, for browsing initiated via user clicks on anchor tags and the forward and back buttons, and for navigation via history.forward() and history.back().
- manages scroll position, so moving forward or backward in the history stack shows pages scrolled to where you left them, even if the browser has scrolled back to the top of the page or completely re-initialized JavaScript.
- enables you to make convenience HTTP request functions which wrap application-specific repetitive processing.
- zero dependencies. When minified and gzipped together with zero-dependency client-side router, [rlite](https://github.com/chrisdavies/rlite), it makes a bundle of about 2K bytes.

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

	// call httpReqFunc() to make convenience HTTP request functions which close over your custom middleware and return promises.
	// middleware callbacks can be undefined have the form:
	//     function cb(xhr, method, url) { }
	// reqCB - called before every request
	// respSuccessCB, respFailureCB - called after a response is received and before the handler is called
	// respAfterCB = called after the handler returns

	spa.httpReqFunc(method, reqCB, respSuccessCB, respFailureCB, respAfterCB);

## example

The `example` directory contains `example.js`, which implements a minimal single-page app, with two pages, Home and About, with page navigation, history management, deep link handling, and server-controlled client version upgrades. It uses [rlite](https://github.com/chrisdavies/rlite) for client-side routing.

Deep-link handling and automatic client version upgrades require server support. See [example/server.go](https://github.com/gkong/spa/blob/main/example/server.go).

![Example App Screen Shot](spa-example.png?raw=true)

## run the example

The `example` directory includes:
- the example JavaScript file, `example.js`, and a minimal `index.html`
- the example code bundled via browserify, ready to be run
- a very simple server, which serves `index.html` and supports deep links.

To run the example:

	# install golang from go.dev
	cd example
	go mod init server
	go build
	./server
	# visit  http://localhost:8000  in a web browser.
	# navigate between the two available pages, home and about, to observe history management.
	# type  http://localhost:8000/about  into your browser's location bar, to observe deep link handling.
	# click the "ping" button to issue a REST API call to the back end.
	# change the value of minRequiredClientVersion to 2 in server.go. rebuild and restart the server.
	# now when you click the "ping" button, you should see the single-page app reload itself.

## install

	npm install git://github.com/gkong/spa.git#main

## acknowledgements

The click-handling code is a simplified version of the click handler in [page.js](https://github.com/visionmedia/page.js).

## status

This code has been in small production for several years.
