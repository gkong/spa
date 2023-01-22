package main

import (
	"net/http"
)

func main() {
	http.HandleFunc("/bundle.js", bundleHandler) // serve the javascript bundle
	http.HandleFunc("/", indexHandler)           // serve index.html for everything else
	http.ListenAndServe("localhost:8000", nil)
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./index.html")
}

func bundleHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./bundle.js")
}
