Cheerio REPL
============

A Node JS REPL for interacting with live [Cheerio](https://github.com/MatthewMueller/cheerio) DOM.

Installation
------------

`npm install -g cheerio-repl`

Usage
-----

`cheerio <URL>`

Global objects available inside the shell:
>  $ = cheerio parsed DOM object  
>  res = raw response object returned from URL  

Example
-------

At the command prompt run the following:
`cheerio http://tubes.io`

The cheerio prompt should appear whereupon you can interact with the loaded DOM like so:
```
cheerio> $('title').text;
'Home - tubes.io'
cheerio>
```

