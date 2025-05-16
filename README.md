# markdownNotesApp

A demo app with server side text correction and markdown compatibility

I used the `marked` library to convert md content to html.

### Project Routes

- `/errorCheck` checks for errors. `POST`
- `/text` saves the user's note(these are saved using sessions) `POST`
- `/text` returns the rendered html `GET`

all post routes should be uploaded with json data like
{
"text": [your data goes here]
}
