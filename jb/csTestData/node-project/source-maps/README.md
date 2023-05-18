This is an example express web server written with TypeScript, demonstrating the advantages of enabling Node's source maps support for transpiled applications. 

To enable source maps support in your own transpiled application, add `--enable-source-maps` to the `node` command that starts your application.

Why should you enable source maps support? When applications are developed with transpiled languages, any error stacktraces will typically point to files, lines, and functions within the built files, rather than the source files.  

Enabling source map support in Node.js can provide developers with a more meaningful error trace which points to lines and functions within the source code. 

This application demonstrates this clearly:

1. Edit `newrelic.js` to add your New Relic INGEST-LICENSE key.
2. Build the project with `npm run build`.
3. Start with `npm run start:nomaps`--this command starts the application without source map support.
4. In your web browser, visit http://localhost:3000/cats multiple times. 

The file `src/models/cats.ts` will randomly throw an error for roughly 25% of all requests, showing you a stack trace like this one:
```shell
Error: Failed to get all cats in model
    at /dist/models/cats.js:41:23
    ... (multiple functions in New Relic Node agent js files)
    at /dist/models/cats.js:39:35
    at Generator.next (<anonymous>)
```
Note that the trace refers to the built files in `/dist`.

5. Stop the application, and restart with `npm run start:withmaps`.
6. Visit http://localhost:3000/cats again multiple times, and you'll see a stack trace like
```shell
Error: Failed to get all cats in model
    at <anonymous> (/src/models/cats.ts:28:13)
    ... (multiple functions in New Relic Node agent js files)
    at <anonymous> (/src/models/cats.ts:26:19)
    at Generator.next (<anonymous>)    
```
This stack trace points to specific functions and line numbers within your source files, so you can find errors more easily. 

