## Workflow

Follow the workflow for the extension you're using. Right now, building the webview is a task the extension initiates.

### Manual building

1.  clone the TeamCodeStream/codestream repo
2.  `cd` into `/shared/ui`
3.  run `npm install --no-save`
    Follow the workflow for the extension you're using. Right now, building the webview is a task the extension initiates.

### Utils

#### build-png-icons

This is a utility to convert SVGs into PNGs

`codestream\shared\ui\utilities> node .\build-png-icons.ts -c "#898F9E"`

On Windows (uses current directory as the output)

`codestream\shared\ui\utilities> node .\build-png-icons.ts -c "#898F9E" -o ".\"`

Convert a single icon

`codestream\shared\ui\utilities> node .\build-png-icons.ts -c "#898F9E" -o ".\" -n "clubhouse"`
