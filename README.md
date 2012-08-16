Cheerio REPL
============

A Node JS REPL for interacting with live [Cheerio](https://github.com/MatthewMueller/cheerio) DOM.

Usage
-----

`node shell.js URL`

Global objects available inside the shell:
>  $ = cheerio parsed DOM object  
>	html = raw html returned from URL  
>	res = raw response object returned from URL  

Example
-------

At the command prompt run the following:
`node shell.js "http://hubify.com"`

The cheerio prompt should appear where upon you can interact with the loaded DOM like so:
```
cheerio> $('title').text;
'Hubify - Data On-demand'
cheerio>
```

